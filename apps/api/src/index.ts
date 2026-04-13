import Fastify from "fastify";
import { randomUUID } from "node:crypto";
import {
  BrainItemResponseSchema,
  BrainItemSchema,
  BrainItemStatusSchema,
  BrainItemTypeSchema,
  CreateBrainItemRequestSchema,
  EventTypeSchema,
  UpdateBrainItemRequestSchema
} from "../../../packages/contracts/src/index";

type BrainItem = ReturnType<typeof BrainItemSchema.parse>;

type EventRecord = {
  id: string;
  userId: string;
  eventType: ReturnType<typeof EventTypeSchema.parse>;
  payload: Record<string, unknown>;
  occurredAt: string;
};

const brainItems = new Map<string, BrainItem>();
const events: EventRecord[] = [];

type ThreadRecord = {
  id: string;
  targetItemId: string;
  kind: "item_comment" | "item_chat";
  createdAt: string;
  updatedAt: string;
};

type MessageRecord = {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

const threads = new Map<string, ThreadRecord>();
const messages = new Map<string, MessageRecord[]>();
const feedCards = new Map<string, { id: string; userId: string; title: string; body: string; dismissed: boolean }>();


const app = Fastify({ logger: true });

const emitEvent = (event: Omit<EventRecord, "id" | "occurredAt">) => {
  events.push({ id: randomUUID(), occurredAt: new Date().toISOString(), ...event });
};

app.post("/brain-items", async (request, reply) => {
  const payload = CreateBrainItemRequestSchema.parse(request.body);
  const now = new Date().toISOString();

  const item = BrainItemResponseSchema.parse({
    id: randomUUID(),
    userId: payload.userId,
    type: BrainItemTypeSchema.parse(payload.type),
    title: payload.title,
    rawContent: payload.rawContent,
    status: BrainItemStatusSchema.parse("active"),
    createdAt: now,
    updatedAt: now
  });

  brainItems.set(item.id, item);
  emitEvent({
    userId: item.userId,
    eventType: EventTypeSchema.parse("brain_item_created"),
    payload: { id: item.id, type: item.type }
  });

  return reply.code(201).send(item);
});

app.get("/brain-items/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const item = brainItems.get(id);
  if (!item) {
    return reply.code(404).send({ message: "Brain item not found" });
  }

  return reply.send(item);
});

app.get("/brain-items", async (request, reply) => {
  const { userId } = request.query as { userId?: string };

  if (!userId) {
    return reply.code(400).send({ message: "userId query parameter is required" });
  }

  const list = Array.from(brainItems.values()).filter((item) => item.userId === userId);
  return list;
});

app.patch("/brain-items/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const existing = brainItems.get(id);

  if (!existing) {
    return reply.code(404).send({ message: "Brain item not found" });
  }

  const updates = UpdateBrainItemRequestSchema.parse(request.body);
  const updated = BrainItemSchema.parse({
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString()
  });

  brainItems.set(id, updated);
  emitEvent({
    userId: updated.userId,
    eventType: EventTypeSchema.parse("brain_item_updated"),
    payload: { id: updated.id, changed: Object.keys(updates) }
  });

  return reply.send(updated);
});



app.post("/threads", async (request, reply) => {
  const { targetItemId, kind } = request.body as { targetItemId: string; kind: "item_comment" | "item_chat" };
  if (!targetItemId || !kind) return reply.code(400).send({ message: "targetItemId and kind are required" });
  const now = new Date().toISOString();
  const thread = { id: randomUUID(), targetItemId, kind, createdAt: now, updatedAt: now };
  threads.set(thread.id, thread);
  messages.set(thread.id, []);
  return reply.code(201).send(thread);
});

app.get("/threads/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const thread = threads.get(id);
  if (!thread) return reply.code(404).send({ message: "Thread not found" });
  return reply.send(thread);
});

app.get("/threads/by-target", async (request) => {
  const { targetItemId } = request.query as { targetItemId?: string };
  return Array.from(threads.values()).filter((thread) => !targetItemId || thread.targetItemId === targetItemId);
});

app.post("/messages", async (request, reply) => {
  const { threadId, role, content } = request.body as { threadId: string; role: "user" | "assistant" | "system"; content: string };
  const thread = threads.get(threadId);
  if (!thread) return reply.code(404).send({ message: "Thread not found" });
  const message = { id: randomUUID(), threadId, role, content, createdAt: new Date().toISOString() };
  messages.set(threadId, [...(messages.get(threadId) ?? []), message]);
  return reply.code(201).send(message);
});

app.get("/threads/:id/messages", async (request, reply) => {
  const { id } = request.params as { id: string };
  if (!threads.has(id)) return reply.code(404).send({ message: "Thread not found" });
  return reply.send(messages.get(id) ?? []);
});

app.get("/feed", async (request) => {
  const { userId } = request.query as { userId?: string };
  const cards = Array.from(feedCards.values()).filter((card) => !card.dismissed && (!userId || card.userId === userId));
  return cards;
});

app.post("/ai/feed/generate-card", async (request, reply) => {
  const { userId, title, body } = request.body as { userId: string; title: string; body: string };
  const card = { id: randomUUID(), userId, title: title ?? "Generated insight", body: body ?? "AI generated placeholder.", dismissed: false };
  feedCards.set(card.id, card);
  return reply.code(201).send(card);
});

app.post("/feed/:id/dismiss", async (request, reply) => {
  const { id } = request.params as { id: string };
  const card = feedCards.get(id);
  if (!card) return reply.code(404).send({ message: "Feed card not found" });
  card.dismissed = true;
  return reply.send({ ok: true });
});

app.get("/events", async (_request, reply) => {
  return reply.code(403).send({
    message: "The /events endpoint is disabled until authentication and per-user event filtering are implemented"
  });
});

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}

export { app, brainItems, events };
