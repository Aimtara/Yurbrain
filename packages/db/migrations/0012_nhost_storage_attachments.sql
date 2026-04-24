-- Nhost storage attachment metadata baseline (additive only).
-- This migration stores storage object ownership and linkage to brain_items.

CREATE TABLE IF NOT EXISTS "attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "bucket" text NOT NULL,
  "object_key" text NOT NULL,
  "kind" text NOT NULL DEFAULT 'file',
  "mime_type" text,
  "size_bytes" bigint,
  "sha256" text,
  "storage_etag" text,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "status" text NOT NULL DEFAULT 'uploaded',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("bucket", "object_key")
);

CREATE UNIQUE INDEX IF NOT EXISTS "brain_items_id_user_unique_idx"
  ON "brain_items" ("id", "user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_user_fk'
  ) THEN
    ALTER TABLE "attachments"
      ADD CONSTRAINT "attachments_user_fk"
      FOREIGN KEY ("user_id")
      REFERENCES "profiles" ("id")
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_item_user_fk'
  ) THEN
    ALTER TABLE "attachments"
      ADD CONSTRAINT "attachments_item_user_fk"
      FOREIGN KEY ("item_id", "user_id")
      REFERENCES "brain_items" ("id", "user_id")
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_bucket_check'
  ) THEN
    ALTER TABLE "attachments"
      ADD CONSTRAINT "attachments_bucket_check"
      CHECK ("bucket" IN ('avatars', 'capture_assets', 'imports'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_kind_check'
  ) THEN
    ALTER TABLE "attachments"
      ADD CONSTRAINT "attachments_kind_check"
      CHECK ("kind" IN ('file', 'image', 'audio', 'video', 'pdf', 'import_blob', 'avatar'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'attachments_status_check'
  ) THEN
    ALTER TABLE "attachments"
      ADD CONSTRAINT "attachments_status_check"
      CHECK ("status" IN ('pending', 'uploaded', 'failed', 'deleted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "attachments_user_item_created_idx"
  ON "attachments" ("user_id", "item_id", "created_at" DESC);

CREATE INDEX IF NOT EXISTS "attachments_item_created_idx"
  ON "attachments" ("item_id", "created_at" DESC);
