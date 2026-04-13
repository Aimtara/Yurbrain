ALTER TABLE "feed_cards"
  ADD COLUMN IF NOT EXISTS "snoozed_until" timestamptz,
  ADD COLUMN IF NOT EXISTS "refresh_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_refreshed_at" timestamptz;

CREATE INDEX IF NOT EXISTS "feed_cards_user_lens_created_idx" ON "feed_cards" ("user_id", "lens", "created_at");
CREATE INDEX IF NOT EXISTS "feed_cards_snoozed_idx" ON "feed_cards" ("snoozed_until");
