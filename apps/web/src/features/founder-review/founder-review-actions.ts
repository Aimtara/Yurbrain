import type { ExecutionLens } from "@yurbrain/ui";
import type { Surface, FeedLens, ContinuityContext } from "../shared/types";
import type { FounderReviewActionModel } from "./types";

type FounderActionDeps = {
  setActiveSurface: (surface: Surface) => void;
  setActiveLens: (lens: FeedLens) => void;
  setExecutionLens: (lens: ExecutionLens) => void;
  setFounderMode: (enabled: boolean) => void;
  setSelectedItemId: (itemId: string) => void;
  setSelectedContinuity: (continuity: ContinuityContext | null) => void;
  loadFeed: (lens: FeedLens) => Promise<void>;
};

export function createFounderActionHandlers(deps: FounderActionDeps) {
  async function run(action: FounderReviewActionModel): Promise<{ notice: string }> {
    if (action.target === "item" && action.itemId) {
      deps.setSelectedItemId(action.itemId);
      deps.setSelectedContinuity({
        whyShown: "Opened from Founder Review follow-up action.",
        whereLeftOff: "Founder review directed this item for focused inspection.",
        changedSince: "Use this detail view to continue the thread.",
        nextStep: "Leave one continuation note, then return to feed."
      });
      deps.setActiveSurface("item");
      return { notice: `Opened item: ${action.label}` };
    }

    deps.setFounderMode(true);
    deps.setActiveLens(action.lens ?? "all");
    deps.setExecutionLens(action.executionLens ?? "all");
    deps.setActiveSurface("feed");
    await deps.loadFeed(action.lens ?? "all");
    return { notice: action.label };
  }

  return { run };
}
