import { type ReactNode } from "react";
import { ExecutionLensBar, FocusFeedScreen, FounderModeToggle, FounderSummarySurface, type ExecutionLens, type FeedLens } from "@yurbrain/ui";

import type { FeedCardDto, FeedCardModel } from "../shared/types";
import { inferPrimaryActionLabel, supportsAction } from "./feed-model";
import { FeedCard } from "@yurbrain/ui";

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
  onDismiss,
  onSnooze,
  onRefresh
}: FocusFeedSurfaceProps) {
  return (
    <>
      <FocusFeedScreen
        title="Focus Feed"
        subtitle="Resurfaced thoughts worth revisiting, without pressure."
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
            <FounderSummarySurface stats={founderStats} suggestedFocus={suggestedFocus} blockedItems={founderBlockedItems} summary={founderSummaryText} />
          ) : undefined
        }
        feedContent={visibleFeedModels.map((model) => (
          <FeedCard
            key={model.card.id}
            variant={model.variant}
            badge={activeLens === "all" ? undefined : activeLens.replaceAll("_", " ")}
            cardType={model.card.cardType}
            lens={model.card.lens}
            title={model.card.title}
            body={model.card.body}
            createdAt={model.card.createdAt}
            lastRefreshedAt={model.card.lastRefreshedAt}
            whyShown={model.card.whyShown}
            lastTouched={model.continuity.lastTouched}
            whereLeftOff={model.continuity.whereLeftOff}
            continuityNote={model.continuity.changedSince}
            nextStep={model.continuity.nextStep}
            availableActions={model.card.availableActions}
            primaryActionLabel={inferPrimaryActionLabel(model.card, Boolean(model.continuity.sourceItemId))}
            onOpen={
              model.continuity.sourceItemId
                ? () => onOpenItem(model)
                : model.card.taskId
                  ? () => onOpenTask(model.card.taskId ?? "")
                  : undefined
            }
            onConvertToTask={model.card.itemId ? () => onConvertToTask(model.card.itemId ?? "", model.card.body) : undefined}
            onStartSession={
              model.card.itemId && supportsAction(model.card, "start_session")
                ? () => {
                    onStartSession(model.card);
                  }
                : undefined
            }
            onDismiss={() => onDismiss(model.card.id)}
            onSnooze={() => onSnooze(model.card)}
            onRefresh={() => onRefresh(model.card.id)}
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
