import { useCallback } from "react";
import type { YurbrainClient } from "@yurbrain/client";

import type { BrainItemDto, FeedCardDto } from "../shared/types";
import { buildExploreSourceItems, buildExploreTrayItems } from "./explore-model";
import type { ConnectionCandidateDto, ConnectionMode, ExploreSaveResponseDto } from "./types";

type UseExploreControllerInput = {
  yurbrainClient: YurbrainClient;
  items: BrainItemDto[];
  selectedSourceIds: string[];
  selectedMode: ConnectionMode;
  setExploreSourceIds: (ids: string[] | ((current: string[]) => string[])) => void;
  setExploreMode: (mode: ConnectionMode) => void;
  setExploreCandidates: (candidates: ConnectionCandidateDto[]) => void;
  setExploreSelectedCandidate: (candidate: ConnectionCandidateDto | null) => void;
  setExploreSavedConnection: (connection: ExploreSaveResponseDto | null) => void;
  setExploreLoading: (loading: boolean) => void;
  setExploreSaving: (saving: boolean) => void;
  setExploreError: (error: string) => void;
  setExploreNotice: (notice: string) => void;
  setFeedCards: (cards: FeedCardDto[] | ((current: FeedCardDto[]) => FeedCardDto[])) => void;
};

export function useExploreController({
  yurbrainClient,
  items,
  selectedSourceIds,
  selectedMode,
  setExploreSourceIds,
  setExploreMode,
  setExploreCandidates,
  setExploreSelectedCandidate,
  setExploreSavedConnection,
  setExploreLoading,
  setExploreSaving,
  setExploreError,
  setExploreNotice,
  setFeedCards
}: UseExploreControllerInput) {
  const sourceCards = buildExploreTrayItems(items, selectedSourceIds);
  const selectedSourceCards = buildExploreSourceItems(items, selectedSourceIds);

  const openExploreWith = useCallback(
    (sourceIds: string[], mode: ConnectionMode = "idea") => {
      const uniqueIds = Array.from(new Set(sourceIds.filter(Boolean))).slice(0, 5);
      setExploreSourceIds(uniqueIds);
      setExploreMode(mode);
      setExploreCandidates([]);
      setExploreSelectedCandidate(null);
      setExploreSavedConnection(null);
      setExploreError("");
      setExploreNotice(
        uniqueIds.length >= 2
          ? "Choose how Yurbrain should look at these cards."
          : "Add another card to make a connection."
      );
    },
    [
      setExploreCandidates,
      setExploreError,
      setExploreMode,
      setExploreNotice,
      setExploreSavedConnection,
      setExploreSelectedCandidate,
      setExploreSourceIds
    ]
  );

  const toggleSource = useCallback(
    (sourceId: string) => {
      setExploreSourceIds((current) => {
        if (current.includes(sourceId)) return current.filter((id) => id !== sourceId);
        if (current.length >= 5) return current;
        return [...current, sourceId];
      });
      setExploreCandidates([]);
      setExploreSelectedCandidate(null);
      setExploreSavedConnection(null);
      setExploreError("");
      setExploreNotice("Selection updated. Preview again when the set feels right.");
    },
    [setExploreCandidates, setExploreError, setExploreNotice, setExploreSavedConnection, setExploreSelectedCandidate, setExploreSourceIds]
  );

  const removeSource = useCallback(
    (sourceId: string) => {
      setExploreSourceIds((current) => current.filter((id) => id !== sourceId));
      setExploreCandidates([]);
      setExploreSelectedCandidate(null);
      setExploreSavedConnection(null);
    },
    [setExploreCandidates, setExploreSavedConnection, setExploreSelectedCandidate, setExploreSourceIds]
  );

  const previewConnection = useCallback(async () => {
    if (selectedSourceIds.length < 2) {
      setExploreError("Add at least two cards to make a connection.");
      return;
    }
    setExploreLoading(true);
    setExploreError("");
    setExploreNotice("Looking for the thread between these…");
    try {
      const response = await yurbrainClient.previewExploreConnection<{
        candidates: ConnectionCandidateDto[];
      }>({
        sourceItemIds: selectedSourceIds,
        mode: selectedMode
      });
      setExploreCandidates(response.candidates);
      setExploreSelectedCandidate(response.candidates[0] ?? null);
      setExploreNotice("Yurbrain noticed a possible connection.");
    } catch {
      setExploreError("Yurbrain could not make a good connection yet. Your cards are still here.");
    } finally {
      setExploreLoading(false);
    }
  }, [
    selectedMode,
    selectedSourceIds,
    setExploreCandidates,
    setExploreError,
    setExploreLoading,
    setExploreNotice,
    setExploreSelectedCandidate,
    yurbrainClient
  ]);

  const saveConnection = useCallback(
    async (candidate: ConnectionCandidateDto) => {
      if (selectedSourceIds.length < 2) {
        setExploreError("Add at least two cards before saving a connection.");
        return null;
      }
      setExploreSaving(true);
      setExploreError("");
      try {
        const response = await yurbrainClient.saveExploreConnection<ExploreSaveResponseDto>({
          sourceItemIds: selectedSourceIds,
          mode: selectedMode,
          candidate
        });
        setExploreSavedConnection(response);
        setExploreNotice("Saved. Yurbrain can bring this back later.");
        setFeedCards((current) => [response.feedCard, ...current.filter((card) => card.id !== response.feedCard.id)]);
        return response;
      } catch {
        setExploreError("Could not save this connection yet. Your cards are still here.");
        return null;
      } finally {
        setExploreSaving(false);
      }
    },
    [
      selectedMode,
      selectedSourceIds,
      setExploreError,
      setExploreNotice,
      setExploreSavedConnection,
      setExploreSaving,
      setFeedCards,
      yurbrainClient
    ]
  );

  return {
    sourceCards,
    selectedSourceCards,
    openExploreWith,
    toggleSource,
    removeSource,
    previewConnection,
    saveConnection
  };
}
