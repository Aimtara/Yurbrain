ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "founder_mode" boolean NOT NULL DEFAULT false;
