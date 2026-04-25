export type MobileSurface = "feed" | "item" | "session" | "time" | "me" | "explore";
export type FeedLens = "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
export type ExecutionLens = "all" | "ready_to_move" | "needs_unblock" | "momentum";
export type TimeWindowOption = "2h" | "4h" | "6h" | "8h" | "24h" | "custom";
export type CaptureSubmitIntent = "save" | "save_and_plan";

export type CaptureDraft = {
  type: "text" | "link" | "image";
  content: string;
  source: string;
  note: string;
};

export type FeedCardDto = {
  id: string;
  cardType: "item" | "digest" | "cluster" | "opportunity" | "open_loop" | "resume" | "connection";
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
    "open_item" | "open_task" | "comment" | "ask_ai" | "convert_to_task" | "start_session" | "dismiss" | "snooze" | "refresh" | "explore"
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
  relatedCount: number | null;
  clusterTopic: string | null;
  clusterItemIds: string[] | null;
  lastTouched: string | null;
  createdAt: string;
};

export type BrainItemDto = {
  id: string;
  userId: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  contentType?: "text" | "link" | "image";
  title: string;
  rawContent: string;
  topicGuess?: string | null;
  sourceApp?: string | null;
  sourceLink?: string | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type ItemArtifactDto = {
  id: string;
  type: "summary" | "classification" | "relation" | "related_items" | "task_conversion" | "connection" | "feed_card" | "feed_card_suggestion";
  payload: Record<string, unknown>;
  createdAt: string;
};

export type ConnectionMode = "pattern" | "idea" | "plan" | "question";

export type ConnectionCandidateDto = {
  title: string;
  summary: string;
  whyTheseConnect: string[];
  suggestedNextActions: string[];
  confidence: number;
};

export type ExploreSourceCardDto = {
  id: string;
  title: string;
  preview: string;
  topic?: string | null;
};

export type ExploreSaveResponseDto = {
  feedCard: FeedCardDto;
  connection: {
    title: string;
    summary: string;
    sourceItemIds: string[];
    connectionMode: ConnectionMode;
    whyTheseConnect: string[];
    suggestedNextActions: string[];
    confidence: number;
    createdAt: string;
  };
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

export type FeedCardVariant = "default" | "execution" | "blocked" | "done" | "resume";

export type FeedCardModel = {
  card: FeedCardDto;
  variant: FeedCardVariant;
  continuity: ContinuityContext;
};

export type FounderSummaryModel = {
  stats: Array<{ label: string; value: string }>;
  summary: string;
  suggested: FeedCardModel | null;
  blocked: FeedCardModel[];
  visibleCards: FeedCardModel[];
};

export type MeInsights = {
  topInsight: string;
  estimation: string;
  carryForward: string;
  postponement: string;
  recommendation: string;
};
