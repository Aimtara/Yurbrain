ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "source_message_id" uuid;

CREATE INDEX IF NOT EXISTS "tasks_source_message_idx" ON "tasks" ("source_message_id");
CREATE INDEX IF NOT EXISTS "sessions_task_state_idx" ON "sessions" ("task_id", "state");
