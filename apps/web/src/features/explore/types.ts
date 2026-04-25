import type { BrainItemDto, FeedCardDto } from "../shared/types";

export type ConnectionMode = "pattern" | "idea" | "plan" | "question";

export type ConnectionCandidateDto = {
  title: string;
  summary: string;
  whyTheseConnect: string[];
  suggestedNextActions: string[];
  confidence: number;
  sourceItemIds?: string[];
};

export type ExplorePreviewResponseDto = {
  sourceItemIds: string[];
  mode: ConnectionMode;
  candidates: ConnectionCandidateDto[];
};

export type ExploreSaveResponseDto = {
  artifact: {
    id: string;
    type: "connection";
    payload: Record<string, unknown>;
    confidence: number;
    createdAt: string;
  };
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

export type ExploreSourceItem = Pick<BrainItemDto, "id" | "title" | "rawContent" | "topicGuess" | "updatedAt">;
