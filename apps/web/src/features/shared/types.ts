import type { FeedCardVariant, FeedLens } from "@yurbrain/ui";

export type Surface = "feed" | "item" | "session" | "time" | "me";

export type FeedCardDto = {
  id: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume";
  lens: FeedLens;
  itemId: string | null;
  taskId: string | null;
  title: string;
  body: string;
  dismissed: boolean;
  snoozedUntil: string | null;
  refreshCount: number;
  postponeCount: number;
  lastPostponedAt: string | null;
  lastRefreshedAt: string | null;
  availableActions: Array<
    "open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh"
  >;
  stateFlags: {
    dismissed: boolean;
    snoozed: boolean;
    actionable: boolean;
    hasSourceItem: boolean;
    hasSourceTask: boolean;
  };
  whyShown: {
    summary: string;
    reasons: string[];
  };
  createdAt: string;
};

export type FeedAction = FeedCardDto["availableActions"][number];

export type ItemArtifactDto = {
  id: string;
  type: "summary" | "classification" | "relation" | "feed_card";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type BrainItemDto = {
  id: string;
  userId: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  title: string;
  rawContent: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ThreadDto = {
  id: string;
  targetItemId: string;
  kind: "item_comment" | "item_chat";
  createdAt: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  threadId: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type TaskDto = {
  id: string;
  userId: string;
  sourceItemId: string | null;
  sourceMessageId?: string | null;
  title: string;
  status: "todo" | "in_progress" | "done";
  createdAt: string;
  updatedAt: string;
};

export type SessionDto = {
  id: string;
  taskId: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
};

export type ActiveTaskContextPeek = {
  title: string;
  excerpt: string;
  updatedAt?: string;
};

export type UserPreferenceDto = {
  userId: string;
  defaultLens: FeedLens;
  cleanFocusMode: boolean;
  founderMode: boolean;
  renderMode: "focus" | "explore";
  aiSummaryMode: "concise" | "balanced" | "detailed";
  feedDensity: "comfortable" | "compact";
  resurfacingIntensity: "gentle" | "balanced" | "active";
  updatedAt: string;
};

export type ConvertResponse =
  | {
      outcome: "task_created";
      confidence: number;
      task: TaskDto;
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    }
  | {
      outcome: "plan_suggested";
      confidence: number;
      title: string;
      steps: string[];
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    }
  | {
      outcome: "not_recommended";
      confidence: number;
      reason: string;
      sourceItemId?: string | null;
      sourceMessageId?: string | null;
    };

export type PlanPreviewDraft = {
  sourceItemId: string;
  title: string;
  steps: Array<{ id: string; title: string; minutes: number }>;
  confidence: number;
};

export type PostponeDraft = {
  cardId: string;
  title: string;
  itemId: string | null;
  postponeCount: number;
};

export type FinishRebalanceDraft = {
  taskTitle: string;
  plannedMinutes: number;
  actualMinutes: number;
  deltaMinutes: number;
  suggestion: string;
};

export type MeInsights = {
  topInsight: string;
  estimationAccuracy: {
    label: string;
    detail: string;
  };
  carryForward: {
    label: string;
    detail: string;
  };
  postponement: {
    label: string;
    detail: string;
  };
  recommendation: string;
};

export type ContinuityContext = {
  whyShown?: string;
  whereLeftOff?: string;
  changedSince?: string;
  blockedState?: string;
  nextStep?: string;
  lastTouched?: string;
  sourceItemId?: string;
  sourceItemTitle?: string;
};

export type FeedCardModel = {
  card: FeedCardDto;
  variant: FeedCardVariant;
  continuity: ContinuityContext;
};
