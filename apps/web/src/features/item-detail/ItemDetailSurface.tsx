import { ItemDetailScreen } from "@yurbrain/ui";

import type { BrainItemDto } from "../shared/types";

type ItemDetailSurfaceProps = {
  selectedItem: BrainItemDto | null;
  continuity: {
    whyShown?: string;
    whereLeftOff?: string;
    changedSince?: string;
    blockedState?: string;
    nextStep?: string;
    lastTouched?: string;
    executionHint?: string;
  };
  selectedArtifacts: { summary: string[]; classification: string[] };
  itemContextLoading: boolean;
  chatError: string;
  itemActionNotice: string;
  suggestedPromptsForDetail: string[];
  relatedItemsForDetail: Array<{ id: string; title: string; hint: string }>;
  timelineEntries: Array<{ id: string; label: string; role: "user" | "assistant" | "system"; timestamp?: string }>;
  canStartSession: boolean;
  onBackToFeed: () => void;
  onQuickAction: (action: "summarize" | "classify" | "convert_to_task" | "next_step") => void;
  onAddComment: (itemId: string, comment: string) => void;
  onConvertCommentToTask: (itemId: string, comment: string) => void;
  onAskYurbrain: (question: string) => void;
  onOpenRelatedItem: (itemId: string) => void;
  onShowRelatedItems: () => void;
  onStartSession: () => void;
};

export function ItemDetailSurface({
  selectedItem,
  continuity,
  selectedArtifacts,
  itemContextLoading,
  chatError,
  itemActionNotice,
  suggestedPromptsForDetail,
  relatedItemsForDetail,
  timelineEntries,
  canStartSession,
  onBackToFeed,
  onQuickAction,
  onAddComment,
  onConvertCommentToTask,
  onAskYurbrain,
  onOpenRelatedItem,
  onShowRelatedItems,
  onStartSession
}: ItemDetailSurfaceProps) {
  return (
    <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px" }}>
      {selectedItem ? (
        <ItemDetailScreen
          item={{ title: selectedItem.title, rawContent: selectedItem.rawContent }}
          whyShown={continuity.whyShown}
          whereLeftOff={continuity.whereLeftOff}
          changedSince={continuity.changedSince}
          blockedState={continuity.blockedState}
          nextStep={continuity.nextStep}
          lastTouched={continuity.lastTouched}
          executionHint={continuity.executionHint}
          summary={selectedArtifacts.summary[0]}
          classification={selectedArtifacts.classification[0]}
          timeline={timelineEntries}
          loading={itemContextLoading}
          errorMessage={chatError}
          actionNotice={itemActionNotice}
          suggestedPrompts={suggestedPromptsForDetail}
          relatedItems={relatedItemsForDetail}
          onBackToFeed={onBackToFeed}
          onQuickAction={onQuickAction}
          onAddComment={(comment) => onAddComment(selectedItem.id, comment)}
          onConvertCommentToTask={(comment) => onConvertCommentToTask(selectedItem.id, comment)}
          onAskYurbrain={onAskYurbrain}
          onOpenRelatedItem={onOpenRelatedItem}
          onShowRelatedItems={onShowRelatedItems}
          onStartSession={onStartSession}
          canStartSession={canStartSession}
          artifactHistory={
            <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", padding: "14px", background: "#ffffff", display: "grid", gap: "8px" }}>
              <h3 style={{ margin: 0 }}>AI artifact history</h3>
              <p style={{ margin: 0, color: "#475569", fontSize: "13px" }}>
                Summaries: {selectedArtifacts.summary.length} · Framing artifacts: {selectedArtifacts.classification.length}
              </p>
              {selectedArtifacts.summary.length > 0 ? (
                <p style={{ margin: 0 }}>
                  <strong>Recent summary:</strong> {selectedArtifacts.summary[0]}
                </p>
              ) : null}
              {selectedArtifacts.classification.length > 0 ? (
                <p style={{ margin: 0 }}>
                  <strong>Recent framing:</strong> {selectedArtifacts.classification[0]}
                </p>
              ) : null}
            </div>
          }
        />
      ) : (
        <div style={{ borderRadius: "20px", border: "1px dashed #cbd5e1", background: "#ffffff", padding: "20px" }}>
          <p style={{ margin: 0 }}>Pick a feed card to restore continuity.</p>
        </div>
      )}
    </section>
  );
}
