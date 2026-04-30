import type {
  FounderReviewAction,
  FounderReviewDiagnosticsResponse,
  FounderReviewResponse
} from "@yurbrain/contracts";

export type FounderReviewModel = FounderReviewResponse;
export type FounderReviewActionModel = FounderReviewAction;
export type FounderReviewAiReadoutModel = FounderReviewModel["aiReadout"];
export type FounderReviewDiagnosticsModel = FounderReviewDiagnosticsResponse;
