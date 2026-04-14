import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "./schema";
import { getDefaultDatabasePath, getDefaultMigrationsPath } from "./paths";

export * from "./schema";

export type BrainItemRecord = {
  id: string;
  userId: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  title: string;
  rawContent: string;
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
  kind: "item_comment" | "item_chat";
  createdAt: string;
  updatedAt: string;
};

export type MessageRecord = {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";

export type FeedCardRecord = {
  id: string;
  userId: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: FeedLens;
  itemId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil?: string | null;
  refreshCount?: number;
  lastRefreshedAt?: string | null;
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
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
};

export type ArtifactRecord = {
  id: string;
  itemId: string;
  type: "summary" | "classification";
  payload: Record<string, unknown>;
  confidence: number;
  createdAt: string;
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
  updateBrainItem: (
    id: string,
    updates: Partial<Pick<BrainItemRecord, "type" | "title" | "rawContent" | "status" | "updatedAt">>
  ) => Promise<BrainItemRecord | null>;
  appendEvent: (event: EventRecord) => Promise<EventRecord>;
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
    updates: Partial<Pick<FeedCardRecord, "dismissed" | "snoozedUntil" | "refreshCount" | "lastRefreshedAt">>
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
  updateSession: (id: string, updates: Partial<Pick<SessionRecord, "state" | "endedAt">>) => Promise<SessionRecord | null>;
  createArtifact: (artifact: ArtifactRecord) => Promise<ArtifactRecord>;
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

function toBrainItemRecord(row: typeof schema.brainItems.$inferSelect): BrainItemRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    rawContent: row.rawContent,
    status: row.status,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toThreadRecord(row: typeof schema.itemThreads.$inferSelect): ThreadRecord {
  return {
    id: row.id,
    targetItemId: row.targetItemId,
    kind: row.kind,
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(row.updatedAt) ?? new Date(0).toISOString()
  };
}

function toMessageRecord(row: typeof schema.threadMessages.$inferSelect): MessageRecord {
  return {
    id: row.id,
    threadId: row.threadId,
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
    title: row.title,
    body: row.body,
    dismissed: row.dismissed,
    snoozedUntil: toIso(row.snoozedUntil),
    refreshCount: row.refreshCount,
    lastRefreshedAt: toIso(row.lastRefreshedAt),
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
    state: row.state,
    startedAt: toIso(row.startedAt) ?? new Date(0).toISOString(),
    endedAt: toIso(row.endedAt)
  };
}

function toArtifactRecord(row: typeof schema.itemArtifacts.$inferSelect): ArtifactRecord {
  return {
    id: row.id,
    itemId: row.itemId,
    type: row.type as "summary" | "classification",
    payload: row.payload as Record<string, unknown>,
    confidence: Number(row.confidence),
    createdAt: toIso(row.createdAt) ?? new Date(0).toISOString()
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
            title: item.title,
            rawContent: item.rawContent,
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
    updateBrainItem: (id, updates) =>
      withDb(async ({ db }) => {
        if (Object.keys(updates).length === 0) {
          return db.select().from(schema.brainItems).where(eq(schema.brainItems.id, id)).limit(1).then((rows) => (rows[0] ? toBrainItemRecord(rows[0]) : null));
        }
        const [row] = await db
          .update(schema.brainItems)
          .set({
            type: updates.type,
            title: updates.title,
            rawContent: updates.rawContent,
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
    createThread: (thread) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.itemThreads)
          .values({
            id: thread.id,
            targetItemId: thread.targetItemId,
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
        const [row] = await db
          .insert(schema.threadMessages)
          .values({
            id: message.id,
            threadId: message.threadId,
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
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.feedCards)
          .values({
            id: card.id,
            userId: card.userId,
            cardType: card.cardType,
            lens: card.lens,
            itemId: card.itemId,
            title: card.title,
            body: card.body,
            dismissed: card.dismissed,
            snoozedUntil: toDate(card.snoozedUntil),
            refreshCount: card.refreshCount ?? 0,
            lastRefreshedAt: toDate(card.lastRefreshedAt),
            createdAt: toDate(card.createdAt) ?? undefined
          })
          .returning();
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
        const [row] = await db
          .update(schema.feedCards)
          .set({
            dismissed: updates.dismissed,
            snoozedUntil: toDate(updates.snoozedUntil),
            refreshCount: updates.refreshCount,
            lastRefreshedAt: toDate(updates.lastRefreshedAt)
          })
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
        const [row] = await db
          .insert(schema.sessions)
          .values({
            id: session.id,
            taskId: session.taskId,
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
    updateSession: (id, updates) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .update(schema.sessions)
          .set({
            state: updates.state,
            endedAt: toDate(updates.endedAt)
          })
          .where(eq(schema.sessions.id, id))
          .returning();
        return row ? toSessionRecord(row) : null;
      }),
    createArtifact: (artifact) =>
      withDb(async ({ db }) => {
        const [row] = await db
          .insert(schema.itemArtifacts)
          .values({
            id: artifact.id,
            itemId: artifact.itemId,
            type: artifact.type,
            payload: artifact.payload,
            confidence: String(artifact.confidence),
            createdAt: toDate(artifact.createdAt) ?? undefined
          })
          .returning();
        return toArtifactRecord(row);
      })
  };
}
