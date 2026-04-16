import { FeedCard } from "@yurbrain/ui";

import type { FeedCardDto, FeedCardModel } from "../shared/types";
import { inferPrimaryActionLabel, supportsAction } from "./feed-model";

type FeedCardRendererProps = {
  model: FeedCardModel;
  activeLensLabel: string;
  onOpenItem: (model: FeedCardModel) => void;
  onOpenTask: (taskId: string) => void;
  onConvertToTask: (itemId: string, body: string) => void;
  onStartSession: (card: FeedCardDto) => void;
  onDismiss: (cardId: string) => void;
  onSnooze: (card: FeedCardDto) => void;
  onRefresh: (cardId: string) => void;
};

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
  activeLensLabel,
  onOpenItem,
  onOpenTask,
  onDismiss,
  onSnooze,
  onRefresh
}: FeedCardRendererProps) {
  const placeholderBody = `${model.card.body}\n\nCluster view placeholder: open the linked continuity thread while grouped rendering is being introduced.`;
  return (
    <FeedCard
      key={model.card.id}
      variant={model.variant}
      badge={activeLensLabel}
      cardType={model.card.cardType}
      lens={model.card.lens}
      title={`${model.card.title} (cluster placeholder)`}
      body={placeholderBody}
      createdAt={model.card.createdAt}
      lastRefreshedAt={model.card.lastRefreshedAt}
      whyShown={model.card.whyShown}
      lastTouched={model.continuity.lastTouched}
      whereLeftOff={model.continuity.whereLeftOff}
      continuityNote={model.continuity.changedSince}
      nextStep={model.continuity.nextStep}
      availableActions={model.card.availableActions}
      primaryActionLabel="Open cluster thread"
      onOpen={renderOpenHandler(model, onOpenItem, onOpenTask)}
      onDismiss={() => onDismiss(model.card.id)}
      onSnooze={() => onSnooze(model.card)}
      onRefresh={() => onRefresh(model.card.id)}
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
