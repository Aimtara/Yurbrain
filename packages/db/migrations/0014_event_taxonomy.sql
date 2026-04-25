ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'capture_created';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'brain_item_opened';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'feed_card_shown';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'feed_card_opened';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'feed_card_acted_on';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'feed_card_dismissed';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'feed_card_snoozed';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'comment_created';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'ai_summary_requested';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'ai_summary_saved';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'item_chat_started';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'item_chat_message_sent';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'plan_requested';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'task_created';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'session_started';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'session_paused';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'session_finished';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'connection_preview_requested';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'connection_saved';
ALTER TYPE "event_type" ADD VALUE IF NOT EXISTS 'connection_dismissed';

CREATE INDEX IF NOT EXISTS "events_user_event_type_occurred_idx"
  ON "events" ("user_id", "event_type", "occurred_at" DESC);
