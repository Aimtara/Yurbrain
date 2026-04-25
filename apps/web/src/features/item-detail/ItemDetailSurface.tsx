import { ItemDetailScreen } from "@yurbrain/ui";

import type { BrainItemDto } from "../shared/types";
import { ItemSearchPanel } from "./ItemSearchPanel";

type ItemDetailSurfaceProps = {
  selectedItem: BrainItemDto | null;
  items: BrainItemDto[];
  itemSearchQuery: string;
  itemSearchTag: string;
  itemSearchType: "all" | "note" | "link" | "idea" | "quote" | "file";
  itemSearchStatus: "all" | "active" | "archived";
  itemSearchProcessingStatus: "all" | "processed" | "pending";
  itemSearchCreatedFrom: string;
  itemSearchCreatedTo: string;
  itemSearchLoading: boolean;
  itemSearchError: string;
  semanticSearchNotice: string;
  emptyStateMessage: string;
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
  onSearchQueryChange: (value: string) => void;
  onSearchTagChange: (value: string) => void;
  onSearchTypeChange: (value: "all" | "note" | "link" | "idea" | "quote" | "file") => void;
  onSearchStatusChange: (value: "all" | "active" | "archived") => void;
  onSearchProcessingStatusChange: (value: "all" | "processed" | "pending") => void;
  onSearchCreatedFromChange: (value: string) => void;
  onSearchCreatedToChange: (value: string) => void;
  onSearchApply: () => void;
  onSearchReset: () => void;
  onSelectSearchItem: (itemId: string) => void;
  onQuickAction: (action: "summarize_progress" | "next_step" | "classify" | "convert_to_task") => void;
  onAddComment: (itemId: string, comment: string) => void;
  onConvertCommentToTask: (itemId: string, comment: string) => void;
  onAskYurbrain: (question: string) => void;
  onOpenRelatedItem: (itemId: string) => void;
  onExploreWithRelated: (itemId: string, relatedItemIds: string[]) => void;
  onStartSession: () => void;
};

export function ItemDetailSurface({
  selectedItem,
  items,
  itemSearchQuery,
  itemSearchTag,
  itemSearchType,
  itemSearchStatus,
  itemSearchProcessingStatus,
  itemSearchCreatedFrom,
  itemSearchCreatedTo,
  itemSearchLoading,
  itemSearchError,
  semanticSearchNotice,
  emptyStateMessage,
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
  onSearchQueryChange,
  onSearchTagChange,
  onSearchTypeChange,
  onSearchStatusChange,
  onSearchProcessingStatusChange,
  onSearchCreatedFromChange,
  onSearchCreatedToChange,
  onSearchApply,
  onSearchReset,
  onSelectSearchItem,
  onQuickAction,
  onAddComment,
  onConvertCommentToTask,
  onAskYurbrain,
  onOpenRelatedItem,
  onExploreWithRelated,
  onStartSession
}: ItemDetailSurfaceProps) {
  return (
    <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px" }}>
      <ItemSearchPanel
        items={items}
        query={itemSearchQuery}
        tag={itemSearchTag}
        type={itemSearchType}
        status={itemSearchStatus}
        processingStatus={itemSearchProcessingStatus}
        createdFrom={itemSearchCreatedFrom}
        createdTo={itemSearchCreatedTo}
        loading={itemSearchLoading}
        error={itemSearchError}
        semanticSearchNotice={semanticSearchNotice}
        emptyStateMessage={emptyStateMessage}
        onQueryChange={onSearchQueryChange}
        onTagChange={onSearchTagChange}
        onTypeChange={onSearchTypeChange}
        onStatusChange={onSearchStatusChange}
        onProcessingStatusChange={onSearchProcessingStatusChange}
        onCreatedFromChange={onSearchCreatedFromChange}
        onCreatedToChange={onSearchCreatedToChange}
        onApply={onSearchApply}
        onReset={onSearchReset}
        onSelectItem={onSelectSearchItem}
      />
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
          onExploreWithRelated={() => onExploreWithRelated(selectedItem.id, relatedItemsForDetail.map((item) => item.id))}
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
          <p style={{ margin: 0 }}>Select an item from search results or feed to restore continuity.</p>
        </div>
      )}
    </section>
  );
}
