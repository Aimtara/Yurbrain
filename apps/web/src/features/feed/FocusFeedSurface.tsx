import { type ReactNode } from "react";
import { ExecutionLensBar, FocusFeedScreen, FounderModeToggle, type ExecutionLens, type FeedLens } from "@yurbrain/ui";

import type { FeedCardDto, FeedCardModel } from "../shared/types";
import { FounderSummaryPanel } from "../founder/FounderSummaryPanel";
import { FeedCardRenderer } from "./FeedCardRenderer";

type FocusFeedSurfaceProps = {
  activeLens: FeedLens;
  executionLens: ExecutionLens;
  founderMode: boolean;
  reentryMessage: string;
  feedLoading: boolean;
  feedError: string;
  visibleFeedModels: FeedCardModel[];
  conversionNotice: string;
  taskError: string;
  tasksLoading: boolean;
  capturePanel: ReactNode;
  founderStats: Array<{ label: string; value: string }>;
  suggestedFocus: { title: string; reason: string; nextStep: string; onOpen: () => void } | null;
  founderBlockedItems: Array<{ id: string; title: string; reason: string; nextMove: string; onOpen: () => void }>;
  founderSummaryText: string;
  onLensChange: (lens: FeedLens) => void;
  onExecutionLensChange: (lens: ExecutionLens) => void;
  onFounderModeToggle: (enabled: boolean) => void;
  onRetry: () => void;
  onReload: () => void;
  onOpenItem: (model: FeedCardModel) => void;
  onOpenTask: (taskId: string) => void;
  onConvertToTask: (itemId: string, body: string) => void;
  onStartSession: (card: FeedCardDto) => void;
  onExploreCard: (model: FeedCardModel) => void;
  onDismiss: (cardId: string) => void;
  onSnooze: (card: FeedCardDto) => void;
  onRefresh: (cardId: string) => void;
};

export function FocusFeedSurface({
  activeLens,
  executionLens,
  founderMode,
  reentryMessage,
  feedLoading,
  feedError,
  visibleFeedModels,
  conversionNotice,
  taskError,
  tasksLoading,
  capturePanel,
  founderStats,
  suggestedFocus,
  founderBlockedItems,
  founderSummaryText,
  onLensChange,
  onExecutionLensChange,
  onFounderModeToggle,
  onRetry,
  onReload,
  onOpenItem,
  onOpenTask,
  onConvertToTask,
  onStartSession,
  onExploreCard,
  onDismiss,
  onSnooze,
  onRefresh
}: FocusFeedSurfaceProps) {
  return (
    <>
      <FocusFeedScreen
        title="Focus Feed"
        subtitle="Find saved thoughts again and continue when one is ready."
        reentryMessage={reentryMessage}
        activeLens={activeLens}
        lenses={["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"]}
        onLensChange={onLensChange}
        loading={feedLoading}
        errorMessage={feedError}
        onRetry={onRetry}
        onReload={onReload}
        hasCards={visibleFeedModels.length > 0}
        founderToggle={<FounderModeToggle enabled={founderMode} onToggle={onFounderModeToggle} />}
        executionLens={founderMode ? <ExecutionLensBar activeLens={executionLens} onChange={onExecutionLensChange} /> : undefined}
        captureComposer={capturePanel}
        founderSummary={
          founderMode ? (
            <FounderSummaryPanel
              founderStats={founderStats}
              suggestedFocus={suggestedFocus}
              founderBlockedItems={founderBlockedItems}
              founderSummaryText={founderSummaryText}
            />
          ) : undefined
        }
        feedContent={visibleFeedModels.map((model) => (
          <FeedCardRenderer
            key={model.card.id}
            model={model}
            activeLensLabel={activeLens.replaceAll("_", " ")}
            onOpenItem={onOpenItem}
            onOpenTask={onOpenTask}
            onConvertToTask={onConvertToTask}
            onStartSession={onStartSession}
            onExplore={onExploreCard}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
            onRefresh={onRefresh}
          />
        ))}
      />
      {(conversionNotice || taskError || tasksLoading) ? (
        <section
          style={{
            margin: "0 auto",
            maxWidth: "960px",
            borderRadius: "20px",
            border: "1px solid #e2e8f0",
            background: "#ffffff",
            padding: "16px",
            display: "grid",
            gap: "8px"
          }}
        >
          {tasksLoading ? <p style={{ margin: 0 }}>Loading task context...</p> : null}
          {conversionNotice ? <p style={{ margin: 0 }}>{conversionNotice}</p> : null}
          {taskError ? <p style={{ margin: 0 }}>{taskError}</p> : null}
        </section>
      ) : null}
    </>
  );
}

