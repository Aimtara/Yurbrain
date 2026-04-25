import {
  bigint,
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
export const eventTypeEnum = pgEnum("event_type", [
  "brain_item_created",
  "brain_item_updated",
  "capture_created",
  "brain_item_opened",
  "feed_card_shown",
  "feed_card_opened",
  "feed_card_acted_on",
  "feed_card_dismissed",
  "feed_card_snoozed",
  "comment_created",
  "ai_summary_requested",
  "ai_summary_saved",
  "item_chat_started",
  "item_chat_message_sent",
  "plan_requested",
  "task_created",
  "session_started",
  "session_paused",
  "session_finished",
  "connection_preview_requested",
  "connection_saved",
  "connection_dismissed"
]);
export const artifactTypeEnum = pgEnum("artifact_type", [
  "summary",
  "classification",
  "relation",
  "feed_card",
  "connection",
  "related_items",
  "task_conversion",
  "feed_card_suggestion"
]);
export const attachmentKindEnum = pgEnum("attachment_kind", [
  "file",
  "image",
  "audio",
  "video",
  "pdf",
  "archive"
]);
export const attachmentStatusEnum = pgEnum("attachment_status", ["pending", "uploaded", "failed", "deleted"]);
export const threadKindEnum = pgEnum("thread_kind", ["item_comment", "item_chat"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const feedCardTypeEnum = pgEnum("feed_card_type", ["item", "digest", "cluster", "opportunity", "open_loop", "resume", "connection"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done"]);
export const sessionStateEnum = pgEnum("session_state", ["running", "paused", "finished"]);

export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    email: text("email"),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    backfillSource: text("backfill_source").default("manual"),
    backfilledAt: timestamp("backfilled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    emailIdx: index("profiles_email_idx").on(t.email),
    profilesCreatedIdx: index("profiles_created_at_idx").on(t.createdAt)
  })
);

export const brainItems = pgTable(
  "brain_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    type: brainItemTypeEnum("type").notNull(),
    contentType: text("content_type").default("text").notNull(),
    title: text("title").notNull(),
    rawContent: text("raw_content").notNull(),
    sourceApp: text("source_app"),
    sourceLink: text("source_link"),
    previewTitle: text("preview_title"),
    previewDescription: text("preview_description"),
    previewImageUrl: text("preview_image_url"),
    note: text("note"),
    topicGuess: text("topic_guess"),
    recencyWeight: integer("recency_weight").default(100).notNull(),
    clusterKey: text("cluster_key"),
    founderModeAtCapture: boolean("founder_mode_at_capture").default(false).notNull(),
    executionMetadata: jsonb("execution_metadata"),
    status: brainItemStatusEnum("status").default("active").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userCreatedIdx: index("brain_items_user_created_idx").on(t.userId, t.createdAt),
    userTopicCreatedIdx: index("brain_items_user_topic_created_idx").on(t.userId, t.topicGuess, t.createdAt),
    userClusterCreatedIdx: index("brain_items_user_cluster_created_idx").on(t.userId, t.clusterKey, t.createdAt)
  })
);

export const itemArtifacts = pgTable("item_artifacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  itemId: uuid("item_id").notNull(),
  userId: uuid("user_id"),
  type: artifactTypeEnum("type").notNull(),
  payload: jsonb("payload").notNull(),
  confidence: text("confidence").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
},
  (t) => ({
    itemCreatedIdx: index("item_artifacts_item_created_idx").on(t.itemId, t.createdAt),
    itemTypeIdx: index("item_artifacts_item_type_idx").on(t.itemId, t.type),
    userCreatedIdx: index("item_artifacts_user_created_idx").on(t.userId, t.createdAt)
  })
);

export const attachments = pgTable(
  "attachments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    itemId: uuid("item_id").notNull(),
    bucket: text("bucket").notNull(),
    objectKey: text("object_key").notNull(),
    kind: attachmentKindEnum("kind").default("file").notNull(),
    mimeType: text("mime_type"),
    sizeBytes: bigint("size_bytes", { mode: "number" }),
    sha256: text("sha256"),
    storageEtag: text("storage_etag"),
    metadata: jsonb("metadata"),
    status: attachmentStatusEnum("status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    bucketObjectKeyUnique: uniqueIndex("attachments_bucket_object_key_uidx").on(t.bucket, t.objectKey),
    userItemCreatedIdx: index("attachments_user_item_created_idx").on(t.userId, t.itemId, t.createdAt),
    itemCreatedIdx: index("attachments_item_created_idx").on(t.itemId, t.createdAt),
    userBucketStatusIdx: index("attachments_user_bucket_status_idx").on(t.userId, t.bucket, t.status, t.createdAt)
  })
);

export const itemThreads = pgTable(
  "item_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    targetItemId: uuid("target_item_id").notNull(),
    userId: uuid("user_id"),
    kind: threadKindEnum("kind").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    targetKindIdx: index("item_threads_target_kind_created_idx").on(t.targetItemId, t.kind, t.createdAt),
    userTargetIdx: index("item_threads_user_target_idx").on(t.userId, t.targetItemId)
  })
);

export const threadMessages = pgTable(
  "thread_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    threadId: uuid("thread_id").notNull(),
    userId: uuid("user_id"),
    role: messageRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    threadCreatedIdx: index("thread_messages_thread_created_idx").on(t.threadId, t.createdAt),
    userThreadCreatedIdx: index("thread_messages_user_thread_created_idx").on(t.userId, t.threadId, t.createdAt)
  })
);

export const feedCards = pgTable(
  "feed_cards",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    cardType: feedCardTypeEnum("card_type").notNull(),
    lens: text("lens").default("all").notNull(),
    itemId: uuid("item_id"),
    taskId: uuid("task_id"),
    title: text("title").notNull(),
    body: text("body").notNull(),
    dismissed: boolean("dismissed").default(false).notNull(),
    snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),
    refreshCount: integer("refresh_count").default(0).notNull(),
    postponeCount: integer("postpone_count").default(0).notNull(),
    relatedCount: integer("related_count"),
    lastPostponedAt: timestamp("last_postponed_at", { withTimezone: true }),
    lastRefreshedAt: timestamp("last_refreshed_at", { withTimezone: true }),
    lastTouched: timestamp("last_touched", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userCreatedIdx: index("feed_cards_user_created_idx").on(t.userId, t.createdAt),
    userLensCreatedIdx: index("feed_cards_user_lens_created_idx").on(t.userId, t.lens, t.createdAt),
    taskIdx: index("feed_cards_task_idx").on(t.taskId)
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

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").notNull(),
    userId: uuid("user_id"),
    state: sessionStateEnum("state").default("running").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true })
  },
  (t) => ({
    taskStateIdx: index("sessions_task_state_idx").on(t.taskId, t.state),
    taskStartedIdx: index("sessions_task_started_idx").on(t.taskId, t.startedAt),
    userStateStartedIdx: index("sessions_user_state_started_idx").on(t.userId, t.state, t.startedAt)
  })
);

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
    founderMode: boolean("founder_mode").default(false).notNull(),
    renderMode: text("render_mode").default("focus").notNull(),
    aiSummaryMode: text("ai_summary_mode").default("balanced").notNull(),
    feedDensity: text("feed_density").default("comfortable").notNull(),
    resurfacingIntensity: text("resurfacing_intensity").default("balanced").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    userPreferencesUnique: uniqueIndex("user_preferences_user_id_idx").on(t.userId)
  })
);

