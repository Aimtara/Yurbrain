export type FounderReviewWindow = "7d";
export type FounderPlatform = "web" | "mobile" | "unknown";

export type FounderSignalItem = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  founderModeAtCapture: boolean;
  platformOrigin: FounderPlatform;
};

export type FounderSignalFeedCard = {
  id: string;
  itemId: string | null;
  taskId: string | null;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume" | "connection";
  lens: "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
  createdAt: string;
  dismissed: boolean;
  postponeCount: number;
  refreshCount: number;
  lastPostponedAt: string | null;
  lastRefreshedAt: string | null;
  hasWhyShown: boolean;
  hasActionability: boolean;
};

export type FounderSignalTask = {
  id: string;
  sourceItemId: string | null;
  sourceMessageId: string | null;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
  platformOrigin: FounderPlatform;
};

export type FounderSignalSession = {
  id: string;
  taskId: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
};

export type FounderSignalMessage = {
  id: string;
  itemId: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  platform: FounderPlatform;
};

export type FounderSignalArtifact = {
  id: string;
  itemId: string;
  type: "summary" | "classification" | "relation" | "related_items" | "task_conversion" | "connection" | "feed_card" | "feed_card_suggestion";
  createdAt: string;
};

export type FounderReviewSignals = {
  userId: string;
  windowStart: string;
  windowEnd: string;
  items: FounderSignalItem[];
  feedCards: FounderSignalFeedCard[];
  tasks: FounderSignalTask[];
  sessions: FounderSignalSession[];
  messages: FounderSignalMessage[];
  artifacts: FounderSignalArtifact[];
  founderModeEnabled: boolean;
};

export const founderReviewDefaultUserId = "11111111-1111-1111-1111-111111111111";
