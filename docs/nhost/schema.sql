-- Yurbrain Nhost/Hasura initial data model (production-minded, additive)
--
-- Existing repo adaptation:
-- - `profiles` already exists and is retained as the user profile table.
-- - `brain_items` is the current equivalent of product-level "captures".
--   This file extends `brain_items` to support richer capture processing metadata
--   rather than introducing a duplicate `captures` table.
--
-- Notes:
-- - UUID primary keys
-- - `created_at`/`updated_at` on all new tables
-- - `user_id` ownership on all user data tables
-- - additive only (no destructive migration steps)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) profiles (existing)
-- One row per auth user; `profiles.id` should map to `auth.users.id`.
-- Existing schema already contains this table.
ALTER TABLE IF EXISTS profiles
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles (email);
CREATE INDEX IF NOT EXISTS profiles_created_at_idx ON profiles (created_at DESC);

-- 2) captures (repo equivalent: brain_items)
-- Add fields needed for richer unified capture processing.
ALTER TABLE IF EXISTS brain_items
  ADD COLUMN IF NOT EXISTS normalized_content text;
ALTER TABLE IF EXISTS brain_items
  ADD COLUMN IF NOT EXISTS metadata jsonb;
ALTER TABLE IF EXISTS brain_items
  ADD COLUMN IF NOT EXISTS processing_status text;
ALTER TABLE IF EXISTS brain_items
  ADD COLUMN IF NOT EXISTS processing_error text;
ALTER TABLE IF EXISTS brain_items
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

UPDATE brain_items SET metadata = '{}'::jsonb WHERE metadata IS NULL;
ALTER TABLE brain_items ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;
ALTER TABLE brain_items ALTER COLUMN metadata SET NOT NULL;

UPDATE brain_items SET processing_status = 'pending' WHERE processing_status IS NULL;
ALTER TABLE brain_items ALTER COLUMN processing_status SET DEFAULT 'pending';
ALTER TABLE brain_items ALTER COLUMN processing_status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'brain_items_processing_status_check'
  ) THEN
    ALTER TABLE brain_items
      ADD CONSTRAINT brain_items_processing_status_check
      CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS brain_items_user_status_created_idx
  ON brain_items (user_id, processing_status, created_at DESC);
CREATE INDEX IF NOT EXISTS brain_items_user_updated_idx
  ON brain_items (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS brain_items_source_link_idx
  ON brain_items (source_link);

-- 3) tags
CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_user_name_unique_idx
  ON tags (user_id, lower(name));
CREATE INDEX IF NOT EXISTS tags_user_created_idx
  ON tags (user_id, created_at DESC);

-- 4) capture_tags (many-to-many: captures <-> tags)
CREATE TABLE IF NOT EXISTS capture_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capture_id, tag_id)
);

CREATE INDEX IF NOT EXISTS capture_tags_user_capture_idx
  ON capture_tags (user_id, capture_id);
CREATE INDEX IF NOT EXISTS capture_tags_user_tag_idx
  ON capture_tags (user_id, tag_id);

-- 5) collections
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_archived boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS collections_user_name_unique_idx
  ON collections (user_id, lower(name));
CREATE INDEX IF NOT EXISTS collections_user_created_idx
  ON collections (user_id, created_at DESC);

-- 6) collection_items (captures in collections)
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, collection_id, capture_id)
);

CREATE INDEX IF NOT EXISTS collection_items_user_collection_position_idx
  ON collection_items (user_id, collection_id, position);
CREATE INDEX IF NOT EXISTS collection_items_user_capture_idx
  ON collection_items (user_id, capture_id);

-- 7) attachments (Nhost storage object metadata)
CREATE TABLE IF NOT EXISTS attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  bucket text NOT NULL,
  object_key text NOT NULL,
  kind text NOT NULL DEFAULT 'file',
  mime_type text,
  size_bytes bigint,
  sha256 text,
  storage_etag text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bucket, object_key)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attachments_bucket_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_bucket_check
      CHECK (bucket IN ('avatars', 'capture_assets', 'imports'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attachments_kind_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_kind_check
      CHECK (kind IN ('file', 'image', 'audio', 'video', 'pdf', 'link_preview'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'attachments_status_check'
  ) THEN
    ALTER TABLE attachments
      ADD CONSTRAINT attachments_status_check
      CHECK (status IN ('pending', 'uploaded', 'failed', 'deleted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS attachments_user_capture_created_idx
  ON attachments (user_id, capture_id, created_at DESC);

-- 8) Optional AI/search/resurfacing tables
CREATE TABLE IF NOT EXISTS embedding_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  requested_by text NOT NULL DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'embedding_jobs_status_check'
  ) THEN
    ALTER TABLE embedding_jobs
      ADD CONSTRAINT embedding_jobs_status_check
      CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS embedding_jobs_user_status_created_idx
  ON embedding_jobs (user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS embedding_jobs_capture_idx
  ON embedding_jobs (capture_id, created_at DESC);

CREATE TABLE IF NOT EXISTS capture_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  model text NOT NULL,
  dimensions integer NOT NULL,
  embedding double precision[] NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, capture_id, model)
);

CREATE INDEX IF NOT EXISTS capture_embeddings_user_capture_idx
  ON capture_embeddings (user_id, capture_id);

CREATE TABLE IF NOT EXISTS ai_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'summary',
  model text NOT NULL,
  summary text NOT NULL,
  token_count integer,
  quality_score numeric(5,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_summaries_user_capture_created_idx
  ON ai_summaries (user_id, capture_id, created_at DESC);

CREATE TABLE IF NOT EXISTS resurfacing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  capture_id uuid NOT NULL REFERENCES brain_items(id) ON DELETE CASCADE,
  trigger_source text NOT NULL DEFAULT 'scheduler',
  reason text NOT NULL,
  score numeric(6,3),
  surfaced_at timestamptz NOT NULL DEFAULT now(),
  acted_at timestamptz,
  outcome text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resurfacing_events_user_surfaced_idx
  ON resurfacing_events (user_id, surfaced_at DESC);
CREATE INDEX IF NOT EXISTS resurfacing_events_capture_idx
  ON resurfacing_events (capture_id, surfaced_at DESC);

-- Optional auth FK (for Nhost environments that expose auth.users and allow FK refs).
-- Keep commented by default because local non-Nhost PGlite dev does not provide auth schema.
-- ALTER TABLE profiles
--   ADD CONSTRAINT profiles_auth_user_fk
--   FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
