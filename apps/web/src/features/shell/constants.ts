import type { CaptureSubmitIntent } from "@yurbrain/ui";

export const userId = "11111111-1111-1111-1111-111111111111";

export const storageKeys = {
  activeLens: "yurbrain.activeLens",
  selectedItemId: "yurbrain.selectedItemId",
  selectedTaskId: "yurbrain.selectedTaskId",
  founderMode: "yurbrain.founderMode",
  renderMode: "yurbrain.renderMode",
  aiSummaryMode: "yurbrain.aiSummaryMode",
  feedDensity: "yurbrain.feedDensity",
  resurfacingIntensity: "yurbrain.resurfacingIntensity",
  executionLens: "yurbrain.executionLens",
  activeSurface: "yurbrain.activeSurface",
  timeWindow: "yurbrain.timeWindow",
  customWindowMinutes: "yurbrain.customWindowMinutes"
} as const;

export const captureSuccessMessages: Record<CaptureSubmitIntent, string> = {
  save: "Saved. Returning you to the feed.",
  save_and_plan: "Saved and routed into lightweight planning.",
  save_and_remind: "Saved for deferred resurfacing."
};
