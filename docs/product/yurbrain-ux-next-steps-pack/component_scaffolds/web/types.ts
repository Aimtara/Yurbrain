export type FeedLens = "all" | "execution" | "open_loops" | "keep_in_mind" | "recent";
export type CardType = "open_loop" | "keep_in_mind" | "resume" | "execution" | "blocked";
export type ExecutionStatus = "idea" | "in_progress" | "blocked" | "done";
export type ExecutionPriority = "low" | "medium" | "high";

export interface FeedCardModel {
  id: string;
  title: string;
  preview: string;
  type: CardType;
  whyShown: string;
  lastTouchedAt?: string;
  executionStatus?: ExecutionStatus;
  executionPriority?: ExecutionPriority;
  actions: Array<"add_update" | "continue" | "plan" | "start_session" | "mark_blocked" | "mark_done" | "revisit_later">;
}

export interface ThreadMessage {
  id: string;
  author: "user" | "ai" | "system";
  content: string;
  createdAt: string;
}

export interface BrainItemDetailModel {
  id: string;
  title: string;
  rawContent: string;
  whyItMatters?: string;
  lastTouchedAt?: string;
  executionStatus?: ExecutionStatus;
  executionPriority?: ExecutionPriority;
  blockedReason?: string;
  thread: ThreadMessage[];
  progressSummary?: {
    summary: string;
    blockers: string[];
    suggestedNextStep?: string;
  };
}
