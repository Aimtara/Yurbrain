ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "render_mode" text NOT NULL DEFAULT 'focus',
  ADD COLUMN IF NOT EXISTS "ai_summary_mode" text NOT NULL DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS "feed_density" text NOT NULL DEFAULT 'comfortable',
  ADD COLUMN IF NOT EXISTS "resurfacing_intensity" text NOT NULL DEFAULT 'balanced';
