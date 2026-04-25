import { ClusterCard, FeedCard } from "@yurbrain/ui";

import type { FeedCardDto, FeedCardModel } from "../shared/types";
import { inferPrimaryActionLabel, supportsAction } from "./feed-model";

type FeedCardRendererProps = {
  model: FeedCardModel;
  activeLensLabel: string;
  onOpenItem: (model: FeedCardModel) => void;
  onOpenTask: (taskId: string) => void;
  onConvertToTask: (itemId: string, body: string) => void;
  onExplore: (model: FeedCardModel) => void;
  onStartSession: (card: FeedCardDto) => void;
  onDismiss: (cardId: string) => void;
  onSnooze: (card: FeedCardDto) => void;
  onRefresh: (cardId: string) => void;
};

function buildClusterMeta(model: FeedCardModel): { topicLabel: string; itemCount: number; description: string } {
  const reasons = model.card.whyShown.reasons;
  const fromTitle = model.card.title.split(":").slice(1).join(":").trim();
  const topicCandidate = [model.card.clusterTopic, fromTitle, ...reasons].find((value) => value && value.length <= 40);
  const topicLabel = (topicCandidate ?? "Related thread").replace(/[.]/g, "").trim() || "Related thread";
  const inferredCount = model.card.relatedCount ?? Math.min(6, Math.max(2, reasons.length + (model.card.itemId ? 1 : 2)));
  return {
    topicLabel,
    itemCount: inferredCount,
    description: model.card.body
  };
}

function renderOpenHandler(model: FeedCardModel, onOpenItem: (model: FeedCardModel) => void, onOpenTask: (taskId: string) => void) {
  if (model.continuity.sourceItemId) {
    return () => onOpenItem(model);
  }
  if (model.card.taskId) {
    return () => onOpenTask(model.card.taskId ?? "");
  }
  return undefined;
}

function renderStandardCard({
  model,
  activeLensLabel,
  onOpenItem,
  onOpenTask,
  onConvertToTask,
  onExplore,
  onStartSession,
  onDismiss,
  onSnooze,
  onRefresh
}: FeedCardRendererProps) {
  return (
    <FeedCard
      key={model.card.id}
      variant={model.variant}
      badge={activeLensLabel}
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
      onOpen={renderOpenHandler(model, onOpenItem, onOpenTask)}
      onConvertToTask={model.card.itemId ? () => onConvertToTask(model.card.itemId ?? "", model.card.body) : undefined}
      onExplore={model.card.itemId ? () => onExplore(model) : undefined}
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
  );
}

function renderClusterPlaceholderCard({
  model,
  onOpenItem,
  onConvertToTask,
  onExplore,
  onDismiss,
  onRefresh
}: FeedCardRendererProps) {
  const clusterMeta = buildClusterMeta(model);
  return (
    <ClusterCard
      key={model.card.id}
      title={model.card.title}
      description={clusterMeta.description}
      whyShown={model.card.whyShown.summary}
      topicLabel={clusterMeta.topicLabel}
      itemCount={clusterMeta.itemCount}
      lastTouched={model.continuity.lastTouched}
      onSeeHighlights={model.continuity.sourceItemId ? () => onOpenItem(model) : undefined}
      onCompare={model.continuity.sourceItemId ? () => onOpenItem(model) : undefined}
      onTryOneToday={model.card.itemId ? () => onConvertToTask(model.card.itemId ?? "", model.card.body) : undefined}
      onExplore={model.card.itemId ? () => onExplore(model) : undefined}
      onDismiss={() => onDismiss(model.card.id)}
    />
  );
}

export function FeedCardRenderer(props: FeedCardRendererProps) {
  switch (props.model.card.cardType) {
    case "cluster":
      return renderClusterPlaceholderCard(props);
    default:
      return renderStandardCard(props);
  }
}
