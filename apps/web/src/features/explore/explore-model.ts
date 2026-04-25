import type { BrainItemDto, FeedCardModel } from "../shared/types";

export function getExploreStartItemId(model: FeedCardModel): string | null {
  return model.card.itemId ?? model.continuity.sourceItemId ?? null;
}

export function buildExploreSourceItems(
  items: BrainItemDto[],
  sourceItemIds: string[]
): Array<{ id: string; title: string; preview: string; meta?: string }> {
  const itemById = new Map(items.map((item) => [item.id, item]));
  return sourceItemIds
    .map((itemId) => itemById.get(itemId))
    .filter((item): item is BrainItemDto => Boolean(item))
    .map((item) => ({
      id: item.id,
      title: item.title,
      preview: item.rawContent,
      meta: item.topicGuess ?? item.type
    }));
}

export function buildExploreTrayItems(
  items: BrainItemDto[],
  selectedIds: string[],
  limit = 12
): Array<{ id: string; title: string; preview: string; meta?: string }> {
  const selected = new Set(selectedIds);
  return items
    .filter((item) => !selected.has(item.id))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      title: item.title,
      preview: item.rawContent,
      meta: item.topicGuess ?? item.type
    }));
}
