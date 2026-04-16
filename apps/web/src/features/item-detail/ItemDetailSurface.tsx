import { ItemChatPanel, ItemDetailScreen } from "@yurbrain/ui";

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
  chatLines: string[];
  chatFallbackNotice: string;
  lastQuestion: string;
  onBackToFeed: () => void;
  onQuickAction: (action: "summarize" | "classify" | "convert_to_task") => void;
  onAddComment: (itemId: string, comment: string) => void;
  onConvertCommentToTask: (itemId: string, comment: string) => void;
  onAskYurbrain: (question: string) => void;
  onOpenRelatedItem: (itemId: string) => void;
  onKeepInMind: () => void;
  onRetryLastQuestion: () => void;
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
  chatLines,
  chatFallbackNotice,
  lastQuestion,
  onBackToFeed,
  onQuickAction,
  onAddComment,
  onConvertCommentToTask,
  onAskYurbrain,
  onOpenRelatedItem,
  onKeepInMind,
  onRetryLastQuestion
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
          onKeepInMind={onKeepInMind}
          chatPanel={
            <ItemChatPanel
              onSend={(question) => onAskYurbrain(question)}
              messages={chatLines}
              mode="ai_query"
              fallbackNotice={chatFallbackNotice}
              errorMessage={chatError}
              onRetry={lastQuestion ? onRetryLastQuestion : undefined}
              hideComposer
            />
          }
          artifactHistory={
            <div style={{ borderRadius: "16px", border: "1px solid #e2e8f0", padding: "16px", background: "#f8fafc" }}>
              <h3 style={{ marginTop: 0 }}>AI continuity artifacts</h3>
              <p style={{ marginBottom: "6px" }}>Summary artifacts: {selectedArtifacts.summary.length}</p>
              <ul style={{ marginTop: 0 }}>
                {selectedArtifacts.summary.slice(0, 3).map((entry, index) => (
                  <li key={`summary-${index}`}>{entry}</li>
                ))}
              </ul>
              <p style={{ marginBottom: "6px" }}>Classification artifacts: {selectedArtifacts.classification.length}</p>
              <ul style={{ marginTop: 0 }}>
                {selectedArtifacts.classification.slice(0, 3).map((entry, index) => (
                  <li key={`classification-${index}`}>{entry}</li>
                ))}
              </ul>
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
