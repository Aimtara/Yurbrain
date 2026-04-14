ALTER TABLE "feed_cards"
  ADD COLUMN IF NOT EXISTS "task_id" uuid;

CREATE INDEX IF NOT EXISTS "feed_cards_task_idx" ON "feed_cards" ("task_id");
CREATE INDEX IF NOT EXISTS "item_artifacts_item_created_idx" ON "item_artifacts" ("item_id", "created_at");
CREATE INDEX IF NOT EXISTS "item_artifacts_item_type_idx" ON "item_artifacts" ("item_id", "type");
CREATE INDEX IF NOT EXISTS "item_threads_target_kind_created_idx" ON "item_threads" ("target_item_id", "kind", "created_at");
CREATE INDEX IF NOT EXISTS "sessions_task_started_idx" ON "sessions" ("task_id", "started_at");
