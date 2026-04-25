-- Explore prototype connection-card support.
-- Additive only: saved connections are ItemArtifacts plus FeedCards, not a
-- persistent ExploreBoard/canvas universe.

ALTER TYPE "artifact_type" ADD VALUE IF NOT EXISTS 'connection';
ALTER TYPE "artifact_type" ADD VALUE IF NOT EXISTS 'related_items';
ALTER TYPE "artifact_type" ADD VALUE IF NOT EXISTS 'task_conversion';
ALTER TYPE "artifact_type" ADD VALUE IF NOT EXISTS 'feed_card_suggestion';

ALTER TYPE "feed_card_type" ADD VALUE IF NOT EXISTS 'connection';

CREATE INDEX IF NOT EXISTS "item_artifacts_user_type_created_idx"
  ON "item_artifacts" ("user_id", "type", "created_at" DESC);
