import { FounderSummarySurface } from "@yurbrain/ui";

type FounderSummaryPanelProps = {
  founderStats: Array<{ label: string; value: string }>;
  suggestedFocus: { title: string; reason: string; nextStep: string; onOpen: () => void } | null;
  founderBlockedItems: Array<{ id: string; title: string; reason: string; nextMove: string; onOpen: () => void }>;
  founderSummaryText: string;
};

export function FounderSummaryPanel({ founderStats, suggestedFocus, founderBlockedItems, founderSummaryText }: FounderSummaryPanelProps) {
  return <FounderSummarySurface stats={founderStats} suggestedFocus={suggestedFocus} blockedItems={founderBlockedItems} summary={founderSummaryText} />;
}
