ALTER TABLE "brain_items"
  ADD COLUMN IF NOT EXISTS "execution_metadata" jsonb;
