-- Nhost/Hasura permission filter support indexes (additive only).
-- These indexes optimize owner-scoped filters used by Hasura row permissions.

CREATE INDEX IF NOT EXISTS "item_threads_user_created_idx"
  ON "item_threads" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "thread_messages_user_created_idx"
  ON "thread_messages" ("user_id", "created_at");

CREATE INDEX IF NOT EXISTS "item_artifacts_user_type_created_idx"
  ON "item_artifacts" ("user_id", "type", "created_at");

CREATE INDEX IF NOT EXISTS "sessions_user_started_idx"
  ON "sessions" ("user_id", "started_at");
