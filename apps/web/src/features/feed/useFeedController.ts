import { useCallback } from "react";
import { dismissFeedCard, getFeed, refreshFeedCard } from "@yurbrain/client";
import type { FeedLens } from "@yurbrain/ui";

import { userId } from "../shell/constants";
import type { ContinuityContext, FeedCardDto, FeedCardModel } from "../shared/types";

type UseFeedControllerInput = {
  feedLimit: number;
  activeLens: FeedLens;
  setFeedLoading: (loading: boolean) => void;
  setFeedCards: (cards: FeedCardDto[]) => void;
  setFeedError: (error: string) => void;
  setSelectedItemId: (itemId: string) => void;
  setSelectedTaskId: (taskId: string) => void;
  setSelectedContinuity: (continuity: ContinuityContext | null) => void;
  setActiveSurface: (surface: "feed" | "item" | "session" | "time" | "me") => void;
};

export function useFeedController({
  feedLimit,
  activeLens,
  setFeedLoading,
  setFeedCards,
  setFeedError,
  setSelectedItemId,
  setSelectedTaskId,
  setSelectedContinuity,
  setActiveSurface
}: UseFeedControllerInput) {
  const loadFeed = useCallback(
    async (lens: FeedLens) => {
      setFeedLoading(true);
      try {
        const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: feedLimit });
        setFeedCards(cards);
        setFeedError("");
      } catch {
        setFeedError("Focus needs a moment. Your memory is safe—try again shortly.");
        setFeedCards([]);
      } finally {
        setFeedLoading(false);
      }
    },
    [feedLimit, setFeedCards, setFeedError, setFeedLoading]
  );

  const openItemFromModel = useCallback(
    (model: FeedCardModel) => {
      const itemId = model.continuity.sourceItemId ?? model.card.itemId;
      if (!itemId) return;
      const continuityFromTask = !model.card.itemId && model.continuity.sourceItemId;
      setSelectedItemId(itemId);
      setSelectedContinuity(
        continuityFromTask
          ? {
              ...model.continuity,
              whyShown: model.continuity.whyShown ?? `Opened from execution task${model.card.title ? `: ${model.card.title}` : ""}.`,
              whereLeftOff: model.continuity.whereLeftOff ?? `Opened from task "${model.card.title}" to restore source continuity.`,
              changedSince:
                model.continuity.changedSince ??
                (model.continuity.sourceItemTitle
                  ? `Source item: ${model.continuity.sourceItemTitle}.`
                  : `Source item opened from task "${model.card.title}".`)
            }
          : model.continuity
      );
      setActiveSurface("item");
    },
    [setActiveSurface, setSelectedContinuity, setSelectedItemId]
  );

  const openTaskFromCard = useCallback(
    (taskId: string) => {
      setSelectedTaskId(taskId);
      setActiveSurface("session");
    },
    [setActiveSurface, setSelectedTaskId]
  );

  const dismissCard = useCallback(
    async (cardId: string) => {
      await dismissFeedCard<{ ok: boolean }>(cardId);
      await loadFeed(activeLens);
    },
    [activeLens, loadFeed]
  );

  const refreshCard = useCallback(
    async (cardId: string) => {
      await refreshFeedCard<{ ok: boolean }>(cardId);
      await loadFeed(activeLens);
    },
    [activeLens, loadFeed]
  );

  return {
    loadFeed,
    openItemFromModel,
    openTaskFromCard,
    dismissCard,
    refreshCard
  };
}
