CREATE TYPE "brain_item_type" AS ENUM ('note', 'link', 'idea', 'quote', 'file');
CREATE TYPE "brain_item_status" AS ENUM ('active', 'archived');
CREATE TYPE "event_type" AS ENUM ('brain_item_created', 'brain_item_updated');
CREATE TYPE "artifact_type" AS ENUM ('summary', 'classification', 'relation', 'feed_card');
CREATE TYPE "thread_kind" AS ENUM ('item_comment', 'item_chat');
CREATE TYPE "message_role" AS ENUM ('user', 'assistant', 'system');
CREATE TYPE "feed_card_type" AS ENUM ('item', 'digest', 'cluster', 'opportunity', 'open_loop', 'resume');
CREATE TYPE "task_status" AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE "session_state" AS ENUM ('running', 'paused', 'finished');

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

CREATE TABLE "item_artifacts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "item_id" uuid NOT NULL,
  "type" "artifact_type" NOT NULL,
  "payload" jsonb NOT NULL,
  "confidence" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "item_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "target_item_id" uuid NOT NULL,
  "kind" "thread_kind" NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "thread_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "thread_id" uuid NOT NULL,
  "role" "message_role" NOT NULL,
  "content" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX "thread_messages_thread_created_idx" ON "thread_messages" ("thread_id", "created_at");

CREATE TABLE "feed_cards" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "card_type" "feed_card_type" NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "dismissed" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "source_item_id" uuid,
  "title" text NOT NULL,
  "status" "task_status" NOT NULL DEFAULT 'todo',
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "sessions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" uuid NOT NULL,
  "state" "session_state" NOT NULL DEFAULT 'running',
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "ended_at" timestamptz
);

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
