CREATE TYPE "brain_item_type" AS ENUM ('note', 'link', 'idea', 'quote', 'file');
CREATE TYPE "brain_item_status" AS ENUM ('active', 'archived');
CREATE TYPE "event_type" AS ENUM ('brain_item_created', 'brain_item_updated');

CREATE TABLE "brain_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "type" "brain_item_type" NOT NULL,
  "title" text NOT NULL,
  "raw_content" text NOT NULL,
  "status" "brain_item_status" NOT NULL DEFAULT 'active',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "brain_items_user_created_idx" ON "brain_items" ("user_id", "created_at");

CREATE TABLE "events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "event_type" "event_type" NOT NULL,
  "payload" jsonb NOT NULL,
  "occurred_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "events_user_occurred_idx" ON "events" ("user_id", "occurred_at");

CREATE TABLE "user_preferences" (
  "user_id" uuid PRIMARY KEY,
  "default_lens" text NOT NULL DEFAULT 'all',
  "clean_focus_mode" boolean NOT NULL DEFAULT true,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "user_preferences_user_id_idx" ON "user_preferences" ("user_id");
