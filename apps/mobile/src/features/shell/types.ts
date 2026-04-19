import type { CaptureSubmitIntent } from "@yurbrain/ui";

import type {
  BrainItemDto,
  CaptureDraft,
  ExecutionLens,
  FeedCardDto,
  FeedCardModel,
  FeedLens,
  FounderSummaryModel,
  MobileSurface,
  SessionDto,
  TaskDto
} from "../shared/types";

export type MobilePrimarySurface = "feed" | "time" | "session" | "me";

export type MobileLoopController = {
  tasks: TaskDto[];
  activeSession: SessionDto | null;
  activeSurface: MobileSurface;
  activeLens: FeedLens;
  founderMode: boolean;
  executionLens: ExecutionLens;
  captureSheetOpen: boolean;
  captureDraft: CaptureDraft;
  captureLoading: boolean;
  captureError: string;
  captureStatusNotice: string;
  captureSuccessNotice: string;
  feedLoading: boolean;
  itemLoading: boolean;
  aiBusy: boolean;
  aiError: string;
  feedError: string;
  itemError: string;
  taskError: string;
  timeNotice: string;
  surfaceNotice: string;
  timeWindow: "2h" | "4h" | "6h" | "8h" | "24h" | "custom";
  customWindowMinutes: string;
  windowMinutes: number;
  feedCards: FeedCardModel[];
  founderSummary: FounderSummaryModel;
  founderStats: Array<{ label: string; value: string }>;
  selectedItem: BrainItemDto | null;
  selectedTask: TaskDto | null;
  selectedTaskSession: SessionDto | null;
  relatedItems: Array<{ id: string; title: string; hint: string }>;
  timelineEntries: Array<{ id: string; role: "user" | "assistant" | "system"; label: string; timestamp?: string }>;
  itemContinuity: {
    whyShown?: string;
    whereLeftOff?: string;
    changedSince?: string;
    blockedState?: string;
    nextStep?: string;
    lastTouched?: string;
  };
  executionContext: { title: string; content: string; hint?: string } | null;
  sessionElapsedLabel: string;
  suggestedTasksForWindow: Array<{ task: TaskDto; minutes: number }>;
  meTopInsight: string;
  meRecommendation: string;
  sessionTabVisible: boolean;
  blockedReasonDraft: string;
  setCaptureDraft: (draft: CaptureDraft) => void;
  setBlockedReasonDraft: (value: string) => void;
  closeCaptureSheet: () => void;
  openCaptureSheet: () => void;
  navigateToPrimarySurface: (surface: MobilePrimarySurface) => void;
  updateLens: (lens: FeedLens) => void;
  toggleFounderMode: (enabled: boolean) => Promise<void>;
  setExecutionLens: (lens: ExecutionLens) => void;
  captureItem: (intent: CaptureSubmitIntent) => Promise<void>;
  openItemFromFeed: (card: FeedCardDto) => void;
  openTask: (taskId: string) => void;
  runFeedAction: (card: FeedCardDto, action: "continue" | "keep_in_focus" | "revisit_later" | "dismiss") => Promise<void>;
  runQuickAction: (action: "summarize_progress" | "next_step" | "classify" | "convert_to_task") => Promise<void>;
  updateItemComment: (value: string) => Promise<void>;
  askItemQuestion: (question: string) => Promise<void>;
  openRelatedItem: (itemId: string) => void;
  startTask: (taskId: string) => Promise<void>;
  startSessionFromItem: () => Promise<void>;
  pauseActiveSession: () => Promise<void>;
  finishActiveSession: () => Promise<void>;
  pauseSessionForSelectedTask: () => Promise<void>;
  finishSessionForSelectedTask: () => Promise<void>;
  blockSessionForSelectedTask: (blockedReason: string) => Promise<void>;
  markTaskDone: () => Promise<void>;
  setTimeWindow: (value: "2h" | "4h" | "6h" | "8h" | "24h" | "custom") => void;
  setCustomWindowMinutes: (value: string) => void;
  startWithoutPlanning: () => Promise<void>;
  switchToFeedForReentry: () => void;
  refreshFeed: () => Promise<void>;
  dismissCard: (cardId: string) => Promise<void>;
  snoozeCard: (cardId: string, minutes?: number) => Promise<void>;
  keepCardInFocus: (cardId: string) => Promise<void>;
  openCard: (cardId: string) => Promise<void>;
  retryFeed: () => Promise<void>;
};
