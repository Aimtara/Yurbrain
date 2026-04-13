import { BrainItemSchema, EventTypeSchema } from "../../../packages/contracts/src";
import type { StoredFeedCard } from "./services/feed/static-feed";

type BrainItem = ReturnType<typeof BrainItemSchema.parse>;

export type EventRecord = {
  id: string;
  userId: string;
  eventType: ReturnType<typeof EventTypeSchema.parse>;
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

export type ArtifactRecord = {
  id: string;
  itemId: string;
  type: "summary" | "classification";
  payload: Record<string, unknown>;
  confidence: number;
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

export type AppState = {
  brainItems: Map<string, BrainItem>;
  events: EventRecord[];
  threads: Map<string, ThreadRecord>;
  messages: Map<string, MessageRecord[]>;
  feedCards: Map<string, StoredFeedCard>;
  tasks: Map<string, TaskRecord>;
  sessions: Map<string, SessionRecord>;
  artifacts: Map<string, ArtifactRecord>;
};

export function createState(): AppState {
  return {
    brainItems: new Map<string, BrainItem>(),
    events: [],
    threads: new Map<string, ThreadRecord>(),
    messages: new Map<string, MessageRecord[]>(),
    feedCards: new Map<string, StoredFeedCard>(),
    tasks: new Map<string, TaskRecord>(),
    sessions: new Map<string, SessionRecord>(),
    artifacts: new Map<string, ArtifactRecord>()
  };
}
