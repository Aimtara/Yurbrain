ALTER TABLE "feed_cards"
  ADD COLUMN IF NOT EXISTS "lens" text DEFAULT 'all' NOT NULL,
  ADD COLUMN IF NOT EXISTS "item_id" uuid;

ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "source_message_id" uuid;

CREATE INDEX IF NOT EXISTS "feed_cards_user_created_idx" ON "feed_cards" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "tasks_user_created_idx" ON "tasks" ("user_id", "created_at");
CREATE INDEX IF NOT EXISTS "tasks_source_item_idx" ON "tasks" ("source_item_id");
