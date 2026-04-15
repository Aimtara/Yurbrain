ALTER TABLE "feed_cards"
  ADD COLUMN IF NOT EXISTS "postpone_count" integer DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS "last_postponed_at" timestamptz;

CREATE INDEX IF NOT EXISTS "feed_cards_postpone_count_idx" ON "feed_cards" ("postpone_count");
