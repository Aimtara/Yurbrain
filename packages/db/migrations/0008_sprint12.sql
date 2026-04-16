ALTER TABLE "brain_items"
  ADD COLUMN IF NOT EXISTS "content_type" text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS "source_app" text,
  ADD COLUMN IF NOT EXISTS "source_link" text,
  ADD COLUMN IF NOT EXISTS "preview_title" text,
  ADD COLUMN IF NOT EXISTS "preview_description" text,
  ADD COLUMN IF NOT EXISTS "preview_image_url" text,
  ADD COLUMN IF NOT EXISTS "topic_guess" text,
  ADD COLUMN IF NOT EXISTS "cluster_key" text,
  ADD COLUMN IF NOT EXISTS "founder_mode_at_capture" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "execution_metadata" jsonb;

CREATE INDEX IF NOT EXISTS "brain_items_user_topic_created_idx" ON "brain_items" ("user_id", "topic_guess", "created_at");
CREATE INDEX IF NOT EXISTS "brain_items_user_cluster_created_idx" ON "brain_items" ("user_id", "cluster_key", "created_at");
