import {
  boolean,
  index,
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
