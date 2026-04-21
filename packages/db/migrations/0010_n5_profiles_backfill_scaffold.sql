-- N5 scaffold: ownership normalization + profile table for Hasura/Nhost cutover.
-- This migration is intentionally non-destructive and parity-preserving.

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" uuid PRIMARY KEY,
  "email" text,
  "display_name" text,
  "avatar_url" text,
  "backfill_source" text DEFAULT 'manual',
  "backfilled_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "profiles"
  ADD COLUMN IF NOT EXISTS "email" text,
  ADD COLUMN IF NOT EXISTS "avatar_url" text,
  ADD COLUMN IF NOT EXISTS "backfill_source" text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS "backfilled_at" timestamptz;

CREATE INDEX IF NOT EXISTS "profiles_created_at_idx" ON "profiles" ("created_at");
CREATE INDEX IF NOT EXISTS "profiles_email_idx" ON "profiles" ("email");

ALTER TABLE "item_artifacts"
  ADD COLUMN IF NOT EXISTS "user_id" uuid;

ALTER TABLE "item_threads"
  ADD COLUMN IF NOT EXISTS "user_id" uuid;

ALTER TABLE "thread_messages"
  ADD COLUMN IF NOT EXISTS "user_id" uuid;

ALTER TABLE "sessions"
  ADD COLUMN IF NOT EXISTS "user_id" uuid;

CREATE INDEX IF NOT EXISTS "item_artifacts_user_created_idx" ON "item_artifacts" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "item_threads_user_target_idx" ON "item_threads" ("user_id", "target_item_id");
CREATE INDEX IF NOT EXISTS "thread_messages_user_thread_created_idx" ON "thread_messages" ("user_id", "thread_id", "created_at");
CREATE INDEX IF NOT EXISTS "sessions_user_state_started_idx" ON "sessions" ("user_id", "state", "started_at");

-- Backfill profile rows from known owner IDs in existing runtime tables.
INSERT INTO "profiles" ("id")
SELECT DISTINCT owner_ids.owner_id
FROM (
  SELECT user_id AS owner_id FROM brain_items
  UNION
  SELECT user_id AS owner_id FROM feed_cards
  UNION
  SELECT user_id AS owner_id FROM tasks
  UNION
  SELECT user_id AS owner_id FROM events
  UNION
  SELECT user_id AS owner_id FROM user_preferences
) AS owner_ids
WHERE owner_ids.owner_id IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
