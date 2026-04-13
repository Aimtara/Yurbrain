import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const brainItemTypeEnum = pgEnum("brain_item_type", ["note", "link", "idea", "quote", "file"]);
export const brainItemStatusEnum = pgEnum("brain_item_status", ["active", "archived"]);
export const eventTypeEnum = pgEnum("event_type", ["brain_item_created", "brain_item_updated"]);
export const artifactTypeEnum = pgEnum("artifact_type", ["summary", "classification", "relation", "feed_card"]);
export const threadKindEnum = pgEnum("thread_kind", ["item_comment", "item_chat"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const feedCardTypeEnum = pgEnum("feed_card_type", ["item", "digest", "cluster", "opportunity", "open_loop", "resume"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const sessionStateEnum = pgEnum("session_state", ["running", "paused", "finished"]);

export const brainItems = pgTable(
  "brain_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    type: brainItemTypeEnum("type").notNull(),
    title: text("title").notNull(),
    rawContent: text("raw_content").notNull(),
    status: brainItemStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userCreatedIdx: index("brain_items_user_created_idx").on(t.userId, t.createdAt)
  })
);

export const itemArtifacts = pgTable("item_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull(),
  type: artifactTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(),
  confidence: text("confidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const itemThreads = pgTable("item_threads", {
  id: uuid("id").defaultRandom().primaryKey(),
  targetItemId: uuid("target_item_id").notNull(),
  kind: threadKindEnum("kind").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const threadMessages = pgTable(
  "thread_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id").notNull(),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({ threadCreatedIdx: index("thread_messages_thread_created_idx").on(t.threadId, t.createdAt) })
);

export const feedCards = pgTable(
  "feed_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    cardType: feedCardTypeEnum("card_type").notNull(),
    lens: text("lens").default("all").notNull(),
    itemId: uuid("item_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    dismissed: boolean("dismissed").default(false).notNull(),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    refreshCount: integer("refresh_count").default(0).notNull(),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userCreatedIdx: index("feed_cards_user_created_idx").on(t.userId, t.createdAt)
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    sourceItemId: uuid("source_item_id"),
    sourceMessageId: uuid("source_message_id"),
    title: text("title").notNull(),
    status: taskStatusEnum("status").default("todo").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userCreatedIdx: index("tasks_user_created_idx").on(t.userId, t.createdAt),
    sourceItemIdx: index("tasks_source_item_idx").on(t.sourceItemId)
  })
);

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull(),
  state: sessionStateEnum("state").default("running").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true })
});

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    eventType: eventTypeEnum("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userOccurredIdx: index("events_user_occurred_idx").on(t.userId, t.occurredAt)
  })
);

export const userPreferences = pgTable(
  "user_preferences",
  {
    userId: uuid("user_id").primaryKey(),
    defaultLens: text("default_lens").default("all").notNull(),
    cleanFocusMode: boolean("clean_focus_mode").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userPreferencesUnique: uniqueIndex("user_preferences_user_id_idx").on(t.userId)
  })
);
