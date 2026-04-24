import type {
  FounderReviewAction,
  FounderReviewDiagnosticsResponse,
  FounderReviewResponse
} from "../../../../../packages/contracts/src";

export type FounderReviewModel = FounderReviewResponse;
export type FounderReviewActionModel = FounderReviewAction;
export type FounderReviewAiReadoutModel = FounderReviewModel["aiReadout"];
export type FounderReviewDiagnosticsModel = FounderReviewDiagnosticsResponse;
