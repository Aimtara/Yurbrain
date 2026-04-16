ALTER TABLE "brain_items"
  ADD COLUMN IF NOT EXISTS "note" text,
  ADD COLUMN IF NOT EXISTS "recency_weight" integer NOT NULL DEFAULT 100;

ALTER TABLE "feed_cards"
  ADD COLUMN IF NOT EXISTS "related_count" integer,
  ADD COLUMN IF NOT EXISTS "last_touched" timestamptz;
