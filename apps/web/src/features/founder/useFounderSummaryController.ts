import { useCallback, useMemo } from "react";

import type { BrainItemDto, ContinuityContext, FeedCardModel, Surface, TaskDto } from "../shared/types";
import { buildFounderBlockedItems, buildFounderStats, buildFounderSuggestedFocus, buildFounderSummaryText } from "./founder-model";

type UseFounderSummaryControllerInput = {
  feedModels: FeedCardModel[];
  visibleFeedModels: FeedCardModel[];
  items: BrainItemDto[];
  tasks: TaskDto[];
  setSelectedItemId: (itemId: string) => void;
  setSelectedContinuity: (continuity: ContinuityContext | null) => void;
  setActiveSurface: (surface: Surface) => void;
};

export function useFounderSummaryController({
  feedModels,
  visibleFeedModels,
  items,
  tasks,
  setSelectedItemId,
  setSelectedContinuity,
  setActiveSurface
}: UseFounderSummaryControllerInput) {
  const founderStats = useMemo(() => buildFounderStats(feedModels, visibleFeedModels), [feedModels, visibleFeedModels]);

  const openFounderItem = useCallback(
    (sourceItemId: string, continuity: ContinuityContext) => {
      setSelectedItemId(sourceItemId);
      setSelectedContinuity(continuity);
      setActiveSurface("item");
    },
    [setActiveSurface, setSelectedContinuity, setSelectedItemId]
  );

  const founderFocusCandidate = useMemo(() => buildFounderSuggestedFocus(visibleFeedModels), [visibleFeedModels]);
  const suggestedFocus = useMemo(
    () =>
      founderFocusCandidate
        ? {
            title: founderFocusCandidate.title,
            reason: founderFocusCandidate.reason,
            nextStep: founderFocusCandidate.nextStep,
            onOpen: () => openFounderItem(founderFocusCandidate.sourceItemId, founderFocusCandidate.continuity)
          }
        : null,
    [founderFocusCandidate, openFounderItem]
  );

  const founderBlockedItems = useMemo(
    () =>
      buildFounderBlockedItems(visibleFeedModels).map((item) => ({
        id: item.id,
        title: item.title,
        reason: item.reason,
        nextMove: item.nextMove,
        onOpen: () => openFounderItem(item.sourceItemId, item.continuity)
      })),
    [openFounderItem, visibleFeedModels]
  );

  const founderSummaryText = useMemo(() => buildFounderSummaryText(feedModels, items, tasks), [feedModels, items, tasks]);

  return {
    founderStats,
    suggestedFocus,
    founderBlockedItems,
    founderSummaryText
  };
}
