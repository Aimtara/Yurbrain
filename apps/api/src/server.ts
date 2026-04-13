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
} from "@yurbrain/contracts";

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
