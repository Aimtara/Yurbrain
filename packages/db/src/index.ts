import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { getDefaultDatabasePath, getDefaultMigrationsPath } from "./paths";

export * from "./schema";

export type BrainItemRecord = {
  id: string;
  userId: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  contentType?: "text" | "link" | "image";
  title: string;
  rawContent: string;
  sourceApp?: string | null;
  sourceLink?: string | null;
  previewTitle?: string | null;
  previewDescription?: string | null;
  previewImageUrl?: string | null;
  note?: string | null;
  topicGuess?: string | null;
  recencyWeight?: number;
  clusterKey?: string | null;
  founderModeAtCapture?: boolean;
  executionMetadata?: Record<string, unknown> | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type EventRecord = {
  id: string;
  userId: string;
  eventType: "brain_item_created" | "brain_item_updated";
  payload: Record<string, unknown>;
  occurredAt: string;
};

export type ThreadRecord = {
  id: string;
  targetItemId: string;
  userId?: string | null;
  kind: "item_comment" | "item_chat";
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  threadId: string;
  userId?: string | null;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
export type RenderMode = "focus" | "explore";
export type AiSummaryMode = "concise" | "balanced" | "detailed";
export type FeedDensity = "comfortable" | "compact";
export type ResurfacingIntensity = "gentle" | "balanced" | "active";

export type FeedCardRecord = {
  id: string;
  userId: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume" | "connection";
  lens: FeedLens;
  itemId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil?: string | null;
  refreshCount?: number;
  postponeCount?: number;
  relatedCount?: number | null;
  lastPostponedAt?: string | null;
  lastRefreshedAt?: string | null;
  lastTouched?: string | null;
  createdAt: string;
};

export type TaskRecord = {
  id: string;
  userId: string;
  sourceItemId: string | null;
  sourceMessageId: string | null;
  title: string;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
};

export type SessionRecord = {
  id: string;
  taskId: string;
  userId?: string | null;
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
};

export type ArtifactRecord = {
  id: string;
  itemId: string;
  userId?: string | null;
  type: "summary" | "classification" | "relation" | "feed_card" | "connection" | "related_items" | "task_conversion" | "feed_card_suggestion";
  payload: Record<string, unknown>;
  confidence: number;
  createdAt: string;
};

export type UserPreferenceRecord = {
  userId: string;
  defaultLens: FeedLens;
  cleanFocusMode: boolean;
  founderMode: boolean;
  renderMode: RenderMode;
  aiSummaryMode: AiSummaryMode;
  feedDensity: FeedDensity;
  resurfacingIntensity: ResurfacingIntensity;
  updatedAt: string;
};

export type UserProfileRecord = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  backfillSource: string | null;
  backfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type RepositoryContext = {
  client: PGlite;
  db: ReturnType<typeof drizzle<typeof schema>>;
};

export type DbRepository = {
  close: () => Promise<void>;
  createBrainItem: (item: BrainItemRecord) => Promise<BrainItemRecord>;
  getBrainItemById: (id: string) => Promise<BrainItemRecord | null>;
  listBrainItemsByUser: (userId: string) => Promise<BrainItemRecord[]>;
  searchBrainItemsByUser: (
    userId: string,
    query: {
      q?: string;
      type?: BrainItemRecord["type"];
      tag?: string;
      createdFrom?: string;
      createdTo?: string;
      status?: BrainItemRecord["status"];
      processingStatus?: "processed" | "pending";
      limit?: number;
    }
  ) => Promise<BrainItemRecord[]>;
  updateBrainItem: (
    id: string,
    updates: Partial<
      Pick<
        BrainItemRecord,
        | "type"
        | "contentType"
        | "title"
        | "rawContent"
        | "sourceApp"
        | "sourceLink"
        | "previewTitle"
        | "previewDescription"
        | "previewImageUrl"
        | "note"
        | "topicGuess"
        | "recencyWeight"
        | "clusterKey"
        | "founderModeAtCapture"
        | "executionMetadata"
        | "status"
        | "updatedAt"
      >
    >
  ) => Promise<BrainItemRecord | null>;
  appendEvent: (event: EventRecord) => Promise<EventRecord>;
  listEventsByUser: (userId: string) => Promise<EventRecord[]>;
  createThread: (thread: ThreadRecord) => Promise<ThreadRecord>;
  getThreadById: (id: string) => Promise<ThreadRecord | null>;
  listThreads: (targetItemId?: string) => Promise<ThreadRecord[]>;
  createMessage: (message: MessageRecord) => Promise<MessageRecord>;
  listMessagesByThread: (threadId: string) => Promise<MessageRecord[]>;
  createFeedCard: (card: FeedCardRecord) => Promise<FeedCardRecord>;
  getFeedCardById: (id: string) => Promise<FeedCardRecord | null>;
  listFeedCardsByUser: (userId: string) => Promise<FeedCardRecord[]>;
  updateFeedCard: (
    id: string,
    updates: Partial<
      Pick<
        FeedCardRecord,
        "dismissed" | "snoozedUntil" | "refreshCount" | "postponeCount" | "relatedCount" | "lastPostponedAt" | "lastRefreshedAt" | "lastTouched"
      >
    >
  ) => Promise<FeedCardRecord | null>;
  createTask: (task: TaskRecord) => Promise<TaskRecord>;
  getTaskById: (id: string) => Promise<TaskRecord | null>;
  updateTask: (
    id: string,
    updates: Partial<Pick<TaskRecord, "title" | "status" | "sourceItemId" | "sourceMessageId" | "updatedAt">>
  ) => Promise<TaskRecord | null>;
  listTasks: (query: { userId?: string; status?: TaskRecord["status"] }) => Promise<TaskRecord[]>;
  createSession: (session: SessionRecord) => Promise<SessionRecord>;
  getSessionById: (id: string) => Promise<SessionRecord | null>;
  findActiveSessionByTaskId: (taskId: string) => Promise<SessionRecord | null>;
  listSessions: (query: { taskId?: string; userId?: string; state?: SessionRecord["state"] }) => Promise<SessionRecord[]>;
  updateSession: (id: string, updates: Partial<Pick<SessionRecord, "state" | "endedAt">>) => Promise<SessionRecord | null>;
  createArtifact: (artifact: ArtifactRecord) => Promise<ArtifactRecord>;
  getArtifactById: (id: string) => Promise<ArtifactRecord | null>;
  listArtifactsByItem: (itemId: string, query?: { type?: ArtifactRecord["type"] }) => Promise<ArtifactRecord[]>;
  getUserProfileById: (userId: string) => Promise<UserProfileRecord | null>;
  upsertUserProfile: (
    userId: string,
    updates?: Partial<Pick<UserProfileRecord, "email" | "displayName" | "avatarUrl" | "backfillSource">> & {
      backfilled?: boolean;
    }
  ) => Promise<UserProfileRecord>;
  listUserProfilesNeedingBackfill: (limit?: number) => Promise<string[]>;
  markUserProfileBackfilled: (userId: string, source?: string) => Promise<UserProfileRecord>;
  getUserPreference: (userId: string) => Promise<UserPreferenceRecord | null>;
  upsertUserPreference: (
    userId: string,
    updates: Partial<
      Pick<
        UserPreferenceRecord,
        "defaultLens" | "cleanFocusMode" | "founderMode" | "renderMode" | "aiSummaryMode" | "feedDensity" | "resurfacingIntensity"
      >
    >
  ) => Promise<UserPreferenceRecord>;
};

export type CreateRepositoryOptions = {
  databasePath?: string;
  migrationsPath?: string;
};

function toIso(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.toISOString();
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  return new Date(value);
}

function fromRecencyStorage(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, (value as number) / 100));
}

function toRecencyStorage(value: number | null | undefined): number {
  if (!Number.isFinite(value)) return 100;
  return Math.max(0, Math.min(100, Math.round((value as number) * 100)));
}

function toBrainItemRecord(row: typeof schema.brainItems.$inferSelect): BrainItemRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    contentType: (row.contentType as BrainItemRecord["contentType"] | null) ?? "text",
    title: row.title,
    rawContent: row.rawContent,
    sourceApp: row.sourceApp,
    sourceLink: row.sourceLink,
    previewTitle: row.previewTitle,
    previewDescription: row.previewDescription,
    previewImageUrl: row.previewImageUrl,
    note: row.note,
    topicGuess: row.topicGuess,
    recencyWeight: fromRecencyStorage(row.recencyWeight),
    clusterKey: row.clusterKey,
    founderModeAtCapture: row.founderModeAtCapture,
    executionMetadata: (row.executionMetadata as Record<string, unknown> | null) ?? null,
    status: row.status,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toThreadRecord(row: typeof schema.itemThreads.$inferSelect): ThreadRecord {
  return {
    id: row.id,
    targetItemId: row.targetItemId,
    userId: row.userId,
    kind: row.kind,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toMessageRecord(row: typeof schema.threadMessages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    threadId: row.threadId,
    userId: row.userId,
    role: row.role,
    content: row.content,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString()
  };
}

function toFeedCardRecord(row: typeof schema.feedCards.$inferSelect): FeedCardRecord {
  return {
    id: row.id,
    userId: row.userId,
    cardType: row.cardType,
    lens: row.lens as FeedLens,
    itemId: row.itemId,
    taskId: row.taskId,
    title: row.title,
    body: row.body,
    dismissed: row.dismissed,
    snoozedUntil: toIso(row.snoozedUntil),
    refreshCount: row.refreshCount,
    postponeCount: row.postponeCount,
    relatedCount: row.relatedCount,
    lastPostponedAt: toIso(row.lastPostponedAt),
    lastRefreshedAt: toIso(row.lastRefreshedAt),
    lastTouched: toIso(row.lastTouched),
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString()
  };
}

function toTaskRecord(row: typeof schema.tasks.$inferSelect): TaskRecord {
  return {
    id: row.id,
    userId: row.userId,
    sourceItemId: row.sourceItemId,
    sourceMessageId: row.sourceMessageId,
    title: row.title,
    status: row.status,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toSessionRecord(row: typeof schema.sessions.$inferSelect): SessionRecord {
  return {
    id: row.id,
    taskId: row.taskId,
    userId: row.userId,
    state: row.state,
    startedAt: toIso(row.startedAt) ?? new Date(0).toISOString(),
    endedAt: toIso(row.endedAt)
  };
}

function toArtifactRecord(row: typeof schema.itemArtifacts.$inferSelect): ArtifactRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    userId: row.userId,
    type: row.type as ArtifactRecord["type"],
    payload: row.payload as Record<string, unknown>,
    confidence: Number(row.confidence),
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString()
  };
}

function toUserPreferenceRecord(row: typeof schema.userPreferences.$inferSelect): UserPreferenceRecord {
  return {
    userId: row.userId,
    defaultLens: row.defaultLens as FeedLens,
    cleanFocusMode: row.cleanFocusMode,
    founderMode: row.founderMode,
    renderMode: row.renderMode as RenderMode,
    aiSummaryMode: row.aiSummaryMode as AiSummaryMode,
    feedDensity: row.feedDensity as FeedDensity,
    resurfacingIntensity: row.resurfacingIntensity as ResurfacingIntensity,
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toUserProfileRecord(row: typeof schema.profiles.$inferSelect): UserProfileRecord {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    backfillSource: row.backfillSource,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString(),
    backfilledAt: toIso(row.backfilledAt)
  };
}

function toEventRecord(row: typeof schema.events.$inferSelect): EventRecord {
  return {
    id: row.id,
    userId: row.userId,
    eventType: row.eventType,
    payload: row.payload as Record<string, unknown>,
    occurredAt: row.occurredAt.toISOString()
  };
}

async function applyMigrations(client: PGlite, migrationsPath: string) {
  await client.exec(
    `CREATE TABLE IF NOT EXISTS yurbrain_schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`
  );

  const files = (await readdir(migrationsPath)).filter((name) => name.endsWith(".sql")).sort((a, b) => a.localeCompare(b));
  const applied = await client.query<{ name: string }>("SELECT name FROM yurbrain_schema_migrations");
  const appliedNames = new Set(applied.rows.map((row) => row.name));

  for (const file of files) {
    if (appliedNames.has(file)) continue;
    const migration = await readFile(path.join(migrationsPath, file), "utf8");
    await client.exec("BEGIN");
    try {
      await client.exec(migration);
      await client.query("INSERT INTO yurbrain_schema_migrations (name) VALUES ($1)", [file]);
      await client.exec("COMMIT");
    } catch (error) {
      await client.exec("ROLLBACK");
      throw error;
    }
  }
}

export async function resetDatabase(options: CreateRepositoryOptions = {}): Promise<void> {
  const databasePath = options.databasePath ?? process.env.YURBRAIN_DB_PATH ?? getDefaultDatabasePath();
  const migrationsPath = options.migrationsPath ?? getDefaultMigrationsPath();
  const parentDir = path.dirname(databasePath);
  await mkdir(parentDir, { recursive: true });

  const client = new PGlite({ dataDir: databasePath });
  await client.exec("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await client.close();

  const migrationClient = new PGlite({ dataDir: databasePath });
  await applyMigrations(migrationClient, migrationsPath);
  await migrationClient.close();
}

async function initializeContext(options: CreateRepositoryOptions): Promise<RepositoryContext> {
  const databasePath = options.databasePath ?? process.env.YURBRAIN_DB_PATH ?? getDefaultDatabasePath();
  const migrationsPath = options.migrationsPath ?? getDefaultMigrationsPath();
  const parentDir = path.dirname(databasePath);
  await mkdir(parentDir, { recursive: true });

  const client = new PGlite({ dataDir: databasePath });
  await applyMigrations(client, migrationsPath);
  return { client, db: drizzle(client, { schema }) };
}

export function createDbRepository(options: CreateRepositoryOptions = {}): DbRepository {
  const contextPromise = initializeContext(options);

  async function withDb<T>(fn: (ctx: RepositoryContext) => Promise<T>): Promise<T> {
    const context = await contextPromise;
    return fn(context);
  }

  return {
    close: async () => {
      const context = await contextPromise;
      await context.client.close();
    },
    createBrainItem: (item) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.brainItems)
          .values({
            id: item.id,
            userId: item.userId,
            type: item.type,
            contentType: item.contentType ?? "text",
            title: item.title,
            rawContent: item.rawContent,
            sourceApp: item.sourceApp,
            sourceLink: item.sourceLink,
            previewTitle: item.previewTitle,
            previewDescription: item.previewDescription,
            previewImageUrl: item.previewImageUrl,
            note: item.note,
            topicGuess: item.topicGuess,
            recencyWeight: toRecencyStorage(item.recencyWeight),
            clusterKey: item.clusterKey,
            founderModeAtCapture: item.founderModeAtCapture ?? false,
            executionMetadata: item.executionMetadata ?? null,
            status: item.status,
            createdAt: toDate(item.createdAt) ?? undefined,
            updatedAt: toDate(item.updatedAt) ?? undefined
          })
          .returning();
        return toBrainItemRecord(row);
      }),
    getBrainItemById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.brainItems).where(eq(schema.brainItems.id, id)).limit(1);
        return row ? toBrainItemRecord(row) : null;
      }),
    listBrainItemsByUser: (userId) =>
      withDb(async ({ db }) => {
        const rows = await db
          .select()
          .from(schema.brainItems)
          .where(eq(schema.brainItems.userId, userId))
          .orderBy(desc(schema.brainItems.createdAt), asc(schema.brainItems.id));
        return rows.map(toBrainItemRecord);
      }),
    searchBrainItemsByUser: (userId, query) =>
      withDb(async ({ db }) => {
        const limit = Math.max(1, Math.min(query.limit ?? 100, 200));
        const clauses = [eq(schema.brainItems.userId, userId)];

        if (query.type) {
          clauses.push(eq(schema.brainItems.type, query.type));
        }
        if (query.status) {
          clauses.push(eq(schema.brainItems.status, query.status));
        }

        if (query.createdFrom) {
          const fromDate = new Date(query.createdFrom);
          if (Number.isFinite(fromDate.getTime())) {
            clauses.push(sql`${schema.brainItems.createdAt} >= ${fromDate}`);
          }
        }
        if (query.createdTo) {
          const toDate = new Date(query.createdTo);
          if (Number.isFinite(toDate.getTime())) {
            clauses.push(sql`${schema.brainItems.createdAt} <= ${toDate}`);
          }
        }

        if (query.processingStatus === "processed") {
          clauses.push(
            sql`exists (
              select 1 from ${schema.itemArtifacts} a
              where a.item_id = ${schema.brainItems.id}
                and a.user_id = ${userId}
                and a.type in ('summary', 'classification')
            )`
          );
        } else if (query.processingStatus === "pending") {
          clauses.push(
            sql`not exists (
              select 1 from ${schema.itemArtifacts} a
              where a.item_id = ${schema.brainItems.id}
                and a.user_id = ${userId}
                and a.type in ('summary', 'classification')
            )`
          );
        }

        const normalizedTag = query.tag?.trim().toLowerCase();
        if (normalizedTag) {
          const like = `%${normalizedTag}%`;
          clauses.push(
            sql`(
              lower(coalesce(${schema.brainItems.topicGuess}, '')) like ${like}
              or exists (
                select 1 from ${schema.itemArtifacts} a
                where a.item_id = ${schema.brainItems.id}
                  and a.user_id = ${userId}
                  and a.type = 'classification'
                  and (
                    lower(coalesce(a.payload ->> 'content', '')) like ${like}
                    or lower(coalesce(a.payload ->> 'rationale', '')) like ${like}
                    or lower(coalesce(a.payload::text, '')) like ${like}
                  )
              )
            )`
          );
        }

        const normalizedQuery = query.q?.trim().toLowerCase();
        if (normalizedQuery) {
          const like = `%${normalizedQuery}%`;
          clauses.push(
            sql`(
              lower(coalesce(${schema.brainItems.title}, '')) like ${like}
              or lower(coalesce(${schema.brainItems.rawContent}, '')) like ${like}
              or lower(coalesce(${schema.brainItems.sourceLink}, '')) like ${like}
              or lower(coalesce(${schema.brainItems.sourceApp}, '')) like ${like}
              or lower(coalesce(${schema.brainItems.note}, '')) like ${like}
              or lower(coalesce(${schema.brainItems.topicGuess}, '')) like ${like}
              or exists (
                select 1 from ${schema.itemArtifacts} a
                where a.item_id = ${schema.brainItems.id}
                  and a.user_id = ${userId}
                  and a.type in ('summary', 'classification')
                  and (
                    lower(coalesce(a.payload ->> 'content', '')) like ${like}
                    or lower(coalesce(a.payload ->> 'rationale', '')) like ${like}
                    or lower(coalesce(a.payload::text, '')) like ${like}
                  )
              )
            )`
          );
        }

        const rows = await db
          .select()
          .from(schema.brainItems)
          .where(and(...clauses))
          .orderBy(desc(schema.brainItems.createdAt), asc(schema.brainItems.id))
          .limit(limit);
        return rows.map(toBrainItemRecord);
      }),
    updateBrainItem: (id, updates) =>
      withDb(async ({ db }) => {
        if (Object.keys(updates).length === 0) {
          return db.select().from(schema.brainItems).where(eq(schema.brainItems.id, id)).limit(1).then((rows) => (rows[0] ? toBrainItemRecord(rows[0]) : null));
        }
        const [row] = await db
          .update(schema.brainItems)
          .set({
            type: updates.type,
            contentType: updates.contentType,
            title: updates.title,
            rawContent: updates.rawContent,
            sourceApp: updates.sourceApp,
            sourceLink: updates.sourceLink,
            previewTitle: updates.previewTitle,
            previewDescription: updates.previewDescription,
            previewImageUrl: updates.previewImageUrl,
            note: updates.note,
            topicGuess: updates.topicGuess,
            recencyWeight: updates.recencyWeight !== undefined ? toRecencyStorage(updates.recencyWeight) : undefined,
            clusterKey: updates.clusterKey,
            founderModeAtCapture: updates.founderModeAtCapture,
            executionMetadata: updates.executionMetadata,
            status: updates.status,
            updatedAt: toDate(updates.updatedAt) ?? undefined
          })
          .where(eq(schema.brainItems.id, id))
          .returning();
        return row ? toBrainItemRecord(row) : null;
      }),
    appendEvent: (event) =>
      withDb(async ({ db }) => {
        await db.insert(schema.events).values({
          id: event.id,
          userId: event.userId,
          eventType: event.eventType,
          payload: event.payload,
          occurredAt: toDate(event.occurredAt) ?? undefined
        });
        return event;
      }),
    listEventsByUser: (userId) =>
      withDb(async ({ db }) => {
        const rows = await db
          .select()
          .from(schema.events)
          .where(eq(schema.events.userId, userId))
          .orderBy(desc(schema.events.occurredAt), desc(schema.events.id));
        return rows.map(toEventRecord);
      }),
    createThread: (thread) =>
      withDb(async ({ db }) => {
        let threadUserId = thread.userId ?? null;
        if (!threadUserId) {
          const [owner] = await db
            .select({ userId: schema.brainItems.userId })
            .from(schema.brainItems)
            .where(eq(schema.brainItems.id, thread.targetItemId))
            .limit(1);
          threadUserId = owner?.userId ?? null;
        }
        const [row] = await db
          .insert(schema.itemThreads)
          .values({
            id: thread.id,
            targetItemId: thread.targetItemId,
            userId: threadUserId,
            kind: thread.kind,
            createdAt: toDate(thread.createdAt) ?? undefined,
            updatedAt: toDate(thread.updatedAt) ?? undefined
          })
          .returning();
        return toThreadRecord(row);
      }),
    getThreadById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.itemThreads).where(eq(schema.itemThreads.id, id)).limit(1);
        return row ? toThreadRecord(row) : null;
      }),
    listThreads: (targetItemId) =>
      withDb(async ({ db }) => {
        const rows = targetItemId
          ? await db
              .select()
              .from(schema.itemThreads)
              .where(eq(schema.itemThreads.targetItemId, targetItemId))
              .orderBy(desc(schema.itemThreads.createdAt), asc(schema.itemThreads.id))
          : await db.select().from(schema.itemThreads).orderBy(desc(schema.itemThreads.createdAt), asc(schema.itemThreads.id));
        return rows.map(toThreadRecord);
      }),
    createMessage: (message) =>
      withDb(async ({ db }) => {
        let messageUserId = message.userId ?? null;
        if (!messageUserId) {
          const [owner] = await db
            .select({ userId: schema.itemThreads.userId })
            .from(schema.itemThreads)
            .where(eq(schema.itemThreads.id, message.threadId))
            .limit(1);
          messageUserId = owner?.userId ?? null;
        }
        const [row] = await db
          .insert(schema.threadMessages)
          .values({
            id: message.id,
            threadId: message.threadId,
            userId: messageUserId,
            role: message.role,
            content: message.content,
            createdAt: toDate(message.createdAt) ?? undefined
          })
          .returning();
        return toMessageRecord(row);
      }),
    listMessagesByThread: (threadId) =>
      withDb(async ({ db }) => {
        const rows = await db
          .select()
          .from(schema.threadMessages)
          .where(eq(schema.threadMessages.threadId, threadId))
          .orderBy(asc(schema.threadMessages.createdAt), asc(schema.threadMessages.id));
        return rows.map(toMessageRecord);
      }),
    createFeedCard: (card) =>
      withDb(async ({ client, db }) => {
        await client.query(
          `INSERT INTO "feed_cards" (
            "id",
            "user_id",
            "card_type",
            "lens",
            "item_id",
            "task_id",
            "title",
            "body",
            "dismissed",
            "snoozed_until",
            "refresh_count",
            "postpone_count",
            "related_count",
            "last_postponed_at",
            "last_refreshed_at",
            "last_touched",
            "created_at"
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )`,
          [
            card.id,
            card.userId,
            card.cardType,
            card.lens,
            card.itemId,
            card.taskId,
            card.title,
            card.body,
            card.dismissed,
            toDate(card.snoozedUntil),
            card.refreshCount ?? 0,
            card.postponeCount ?? 0,
            card.relatedCount ?? null,
            toDate(card.lastPostponedAt),
            toDate(card.lastRefreshedAt),
            toDate(card.lastTouched),
            toDate(card.createdAt) ?? new Date()
          ]
        );
        const [row] = await db.select().from(schema.feedCards).where(eq(schema.feedCards.id, card.id)).limit(1);
        if (!row) {
          throw new Error("Failed to insert feed card");
        }
        return toFeedCardRecord(row);
      }),
    getFeedCardById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.feedCards).where(eq(schema.feedCards.id, id)).limit(1);
        return row ? toFeedCardRecord(row) : null;
      }),
    listFeedCardsByUser: (userId) =>
      withDb(async ({ db }) => {
        const rows = await db
          .select()
          .from(schema.feedCards)
          .where(eq(schema.feedCards.userId, userId))
          .orderBy(desc(schema.feedCards.createdAt), asc(schema.feedCards.id));
        return rows.map(toFeedCardRecord);
      }),
    updateFeedCard: (id, updates) =>
      withDb(async ({ db }) => {
        const patch: Partial<typeof schema.feedCards.$inferInsert> = {};
        if (updates.dismissed !== undefined) {
          patch.dismissed = updates.dismissed;
        }
        if (updates.snoozedUntil !== undefined) {
          patch.snoozedUntil = toDate(updates.snoozedUntil);
        }
        if (updates.refreshCount !== undefined) {
          patch.refreshCount = updates.refreshCount;
        }
        if (updates.postponeCount !== undefined) {
          patch.postponeCount = updates.postponeCount;
        }
        if (updates.relatedCount !== undefined) {
          patch.relatedCount = updates.relatedCount;
        }
        if (updates.lastPostponedAt !== undefined) {
          patch.lastPostponedAt = toDate(updates.lastPostponedAt);
        }
        if (updates.lastRefreshedAt !== undefined) {
          patch.lastRefreshedAt = toDate(updates.lastRefreshedAt);
        }
        if (updates.lastTouched !== undefined) {
          patch.lastTouched = toDate(updates.lastTouched);
        }
        if (Object.keys(patch).length === 0) {
          const [current] = await db.select().from(schema.feedCards).where(eq(schema.feedCards.id, id)).limit(1);
          return current ? toFeedCardRecord(current) : null;
        }
        const [row] = await db
          .update(schema.feedCards)
          .set(patch)
          .where(eq(schema.feedCards.id, id))
          .returning();
        return row ? toFeedCardRecord(row) : null;
      }),
    createTask: (task) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.tasks)
          .values({
            id: task.id,
            userId: task.userId,
            sourceItemId: task.sourceItemId,
            sourceMessageId: task.sourceMessageId,
            title: task.title,
            status: task.status,
            createdAt: toDate(task.createdAt) ?? undefined,
            updatedAt: toDate(task.updatedAt) ?? undefined
          })
          .returning();
        return toTaskRecord(row);
      }),
    getTaskById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id)).limit(1);
        return row ? toTaskRecord(row) : null;
      }),
    updateTask: (id, updates) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .update(schema.tasks)
          .set({
            title: updates.title,
            status: updates.status,
            sourceItemId: updates.sourceItemId,
            sourceMessageId: updates.sourceMessageId,
            updatedAt: toDate(updates.updatedAt) ?? undefined
          })
          .where(eq(schema.tasks.id, id))
          .returning();
        return row ? toTaskRecord(row) : null;
      }),
    listTasks: (query) =>
      withDb(async ({ db }) => {
        const clauses = [];
        if (query.userId) clauses.push(eq(schema.tasks.userId, query.userId));
        if (query.status) clauses.push(eq(schema.tasks.status, query.status));
        const rows =
          clauses.length === 0
            ? await db.select().from(schema.tasks).orderBy(desc(schema.tasks.createdAt), asc(schema.tasks.id))
            : await db
                .select()
                .from(schema.tasks)
                .where(and(...clauses))
                .orderBy(desc(schema.tasks.createdAt), asc(schema.tasks.id));
        return rows.map(toTaskRecord);
      }),
    createSession: (session) =>
      withDb(async ({ db }) => {
        let sessionUserId = session.userId ?? null;
        if (!sessionUserId) {
          const [task] = await db.select({ userId: schema.tasks.userId }).from(schema.tasks).where(eq(schema.tasks.id, session.taskId)).limit(1);
          sessionUserId = task?.userId ?? null;
        }
        const [row] = await db
          .insert(schema.sessions)
          .values({
            id: session.id,
            taskId: session.taskId,
            userId: sessionUserId,
            state: session.state,
            startedAt: toDate(session.startedAt) ?? undefined,
            endedAt: toDate(session.endedAt)
          })
          .returning();
        return toSessionRecord(row);
      }),
    getSessionById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
        return row ? toSessionRecord(row) : null;
      }),
    findActiveSessionByTaskId: (taskId) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .select()
          .from(schema.sessions)
          .where(and(eq(schema.sessions.taskId, taskId), sql`${schema.sessions.state} <> 'finished'`))
          .orderBy(desc(schema.sessions.startedAt), desc(schema.sessions.id))
          .limit(1);
        return row ? toSessionRecord(row) : null;
      }),
    listSessions: (query) =>
      withDb(async ({ db }) => {
        const clauses = [];
        if (query.taskId) {
          clauses.push(eq(schema.sessions.taskId, query.taskId));
        }
        if (query.state) {
          clauses.push(eq(schema.sessions.state, query.state));
        }
        if (query.userId) {
          const ownedTasks = await db.select({ id: schema.tasks.id }).from(schema.tasks).where(eq(schema.tasks.userId, query.userId));
          if (ownedTasks.length === 0) {
            return [];
          }
          clauses.push(inArray(schema.sessions.taskId, ownedTasks.map((task) => task.id)));
        }
        const rows =
          clauses.length === 0
            ? await db.select().from(schema.sessions).orderBy(desc(schema.sessions.startedAt), desc(schema.sessions.id))
            : await db
                .select()
                .from(schema.sessions)
                .where(and(...clauses))
                .orderBy(desc(schema.sessions.startedAt), desc(schema.sessions.id));
        return rows.map(toSessionRecord);
      }),
    updateSession: (id, updates) =>
      withDb(async ({ db }) => {
        const patch: Partial<typeof schema.sessions.$inferInsert> = {};
        if (updates.state !== undefined) {
          patch.state = updates.state;
        }
        if (updates.endedAt !== undefined) {
          patch.endedAt = toDate(updates.endedAt);
        }
        if (Object.keys(patch).length === 0) {
          const [current] = await db.select().from(schema.sessions).where(eq(schema.sessions.id, id)).limit(1);
          return current ? toSessionRecord(current) : null;
        }
        const [row] = await db
          .update(schema.sessions)
          .set(patch)
          .where(eq(schema.sessions.id, id))
          .returning();
        return row ? toSessionRecord(row) : null;
      }),
    createArtifact: (artifact) =>
      withDb(async ({ db }) => {
        let artifactUserId = artifact.userId ?? null;
        if (!artifactUserId) {
          const [owner] = await db
            .select({ userId: schema.brainItems.userId })
            .from(schema.brainItems)
            .where(eq(schema.brainItems.id, artifact.itemId))
            .limit(1);
          artifactUserId = owner?.userId ?? null;
        }
        const [row] = await db
          .insert(schema.itemArtifacts)
          .values({
            id: artifact.id,
            itemId: artifact.itemId,
            userId: artifactUserId,
            type: artifact.type,
            payload: artifact.payload,
            confidence: String(artifact.confidence),
            createdAt: toDate(artifact.createdAt) ?? undefined
          })
          .returning();
        return toArtifactRecord(row);
      }),
    getArtifactById: (id) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.itemArtifacts).where(eq(schema.itemArtifacts.id, id)).limit(1);
        return row ? toArtifactRecord(row) : null;
      }),
    listArtifactsByItem: (itemId, query) =>
      withDb(async ({ db }) => {
        const rows = query?.type
          ? await db
              .select()
              .from(schema.itemArtifacts)
              .where(and(eq(schema.itemArtifacts.itemId, itemId), eq(schema.itemArtifacts.type, query.type)))
              .orderBy(desc(schema.itemArtifacts.createdAt), desc(schema.itemArtifacts.id))
          : await db
              .select()
              .from(schema.itemArtifacts)
              .where(eq(schema.itemArtifacts.itemId, itemId))
              .orderBy(desc(schema.itemArtifacts.createdAt), desc(schema.itemArtifacts.id));
        return rows.map(toArtifactRecord);
      }),
    getUserPreference: (userId) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.userPreferences).where(eq(schema.userPreferences.userId, userId)).limit(1);
        return row ? toUserPreferenceRecord(row) : null;
      }),
    upsertUserPreference: (userId, updates) =>
      withDb(async ({ db }) => {
        const updatePatch: Partial<typeof schema.userPreferences.$inferInsert> = {
          updatedAt: new Date()
        };
        if (updates.defaultLens !== undefined) updatePatch.defaultLens = updates.defaultLens;
        if (updates.cleanFocusMode !== undefined) updatePatch.cleanFocusMode = updates.cleanFocusMode;
        if (updates.founderMode !== undefined) updatePatch.founderMode = updates.founderMode;
        if (updates.renderMode !== undefined) updatePatch.renderMode = updates.renderMode;
        if (updates.aiSummaryMode !== undefined) updatePatch.aiSummaryMode = updates.aiSummaryMode;
        if (updates.feedDensity !== undefined) updatePatch.feedDensity = updates.feedDensity;
        if (updates.resurfacingIntensity !== undefined) updatePatch.resurfacingIntensity = updates.resurfacingIntensity;

        const [row] = await db
          .insert(schema.userPreferences)
          .values({
            userId,
            defaultLens: updates.defaultLens ?? "all",
            cleanFocusMode: updates.cleanFocusMode ?? true,
            founderMode: updates.founderMode ?? false,
            renderMode: updates.renderMode ?? "focus",
            aiSummaryMode: updates.aiSummaryMode ?? "balanced",
            feedDensity: updates.feedDensity ?? "comfortable",
            resurfacingIntensity: updates.resurfacingIntensity ?? "balanced",
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: schema.userPreferences.userId,
            set: updatePatch
          })
          .returning();
        return toUserPreferenceRecord(row);
      }),
    getUserProfileById: (userId) =>
      withDb(async ({ db }) => {
        const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId)).limit(1);
        return row ? toUserProfileRecord(row) : null;
      }),
    upsertUserProfile: (userId, updates = {}) =>
      withDb(async ({ db }) => {
        const updatePatch: Partial<typeof schema.profiles.$inferInsert> = {
          updatedAt: new Date()
        };
        if (updates.backfilled !== undefined) {
          updatePatch.backfilledAt = updates.backfilled ? new Date() : null;
        }
        if (updates.displayName !== undefined) updatePatch.displayName = updates.displayName;
        if (updates.avatarUrl !== undefined) updatePatch.avatarUrl = updates.avatarUrl;
        if (updates.backfillSource !== undefined) updatePatch.backfillSource = updates.backfillSource;

        const [row] = await db
          .insert(schema.profiles)
          .values({
            id: userId,
            displayName: updates.displayName ?? null,
            avatarUrl: updates.avatarUrl ?? null,
            backfillSource: updates.backfillSource ?? "manual",
            backfilledAt: updates.backfilled ? new Date() : null,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: schema.profiles.id,
            set: updatePatch
          })
          .returning();
        return toUserProfileRecord(row);
      }),
    listUserProfilesNeedingBackfill: (limit = 200) =>
      withDb(async ({ db }) => {
        const ownerIds = new Set<string>();

        const [brainItemOwners, feedCardOwners, taskOwners, eventOwners, preferenceOwners, sessionOwners, threadOwners, messageOwners, artifactOwners] = await Promise.all([
          db.selectDistinct({ userId: schema.brainItems.userId }).from(schema.brainItems).where(sql`${schema.brainItems.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.feedCards.userId }).from(schema.feedCards).where(sql`${schema.feedCards.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.tasks.userId }).from(schema.tasks).where(sql`${schema.tasks.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.events.userId }).from(schema.events).where(sql`${schema.events.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.userPreferences.userId }).from(schema.userPreferences).where(sql`${schema.userPreferences.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.sessions.userId }).from(schema.sessions).where(sql`${schema.sessions.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.itemThreads.userId }).from(schema.itemThreads).where(sql`${schema.itemThreads.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.threadMessages.userId }).from(schema.threadMessages).where(sql`${schema.threadMessages.userId} IS NOT NULL`),
          db.selectDistinct({ userId: schema.itemArtifacts.userId }).from(schema.itemArtifacts).where(sql`${schema.itemArtifacts.userId} IS NOT NULL`)
        ]);

        for (const owner of [
          ...brainItemOwners,
          ...feedCardOwners,
          ...taskOwners,
          ...eventOwners,
          ...preferenceOwners,
          ...sessionOwners,
          ...threadOwners,
          ...messageOwners,
          ...artifactOwners
        ]) {
          if (owner.userId) {
            ownerIds.add(owner.userId);
          }
        }

        const sortedOwnerIds = Array.from(ownerIds).sort((left, right) => left.localeCompare(right));
        const existingProfiles = sortedOwnerIds.length
          ? await db.select({ id: schema.profiles.id }).from(schema.profiles).where(inArray(schema.profiles.id, sortedOwnerIds))
          : [];
        const existingProfileIds = new Set(existingProfiles.map((profile) => profile.id));

        return sortedOwnerIds.filter((userId) => !existingProfileIds.has(userId)).slice(0, limit);
      }),
    markUserProfileBackfilled: (userId, source = "n5_backfill") =>
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.profiles)
          .values({
            id: userId,
            backfillSource: source,
            backfilledAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .onConflictDoUpdate({
            target: schema.profiles.id,
            set: {
              backfillSource: source,
              backfilledAt: new Date(),
              updatedAt: new Date()
            }
          })
          .returning();
        return toUserProfileRecord(row);
      })
  };
}
