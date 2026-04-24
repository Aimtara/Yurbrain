import { useCallback } from "react";
import { type YurbrainClient } from "@yurbrain/client";

import type { BrainItemDto, BrainItemSearchQuery } from "../shared/types";

type UseBrainItemsControllerInput = {
  yurbrainClient: YurbrainClient;
  selectedItemId: string;
  setItems: (items: BrainItemDto[]) => void;
  setItemsError: (error: string) => void;
  setSelectedItemId: (itemId: string) => void;
  setItemsLoading: (loading: boolean) => void;
};

export function useBrainItemsController({
  yurbrainClient,
  selectedItemId,
  setItems,
  setItemsError,
  setSelectedItemId,
  setItemsLoading
}: UseBrainItemsControllerInput) {
  const searchItems = useCallback(
    async (filters: BrainItemSearchQuery = {}) => {
      setItemsLoading(true);
      try {
        const response = await yurbrainClient.listBrainItems<BrainItemDto[]>({
          q: filters.q?.trim() || undefined,
          type: filters.type || undefined,
          tag: filters.tag?.trim() || undefined,
          status: filters.status || undefined,
          processingStatus: filters.processingStatus || undefined,
          createdFrom: filters.createdFrom || undefined,
          createdTo: filters.createdTo || undefined
        });
        const nextItems = [...response].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        setItems(nextItems);
        setItemsError("");
        if (nextItems.length === 0) {
          setSelectedItemId("");
          return;
        }
        if (!nextItems.some((item) => item.id === selectedItemId)) {
          setSelectedItemId(nextItems[0].id);
        }
      } catch {
        setItemsError("Could not load captured items.");
      } finally {
        setItemsLoading(false);
      }
    },
    [selectedItemId, setItems, setItemsError, setItemsLoading, setSelectedItemId, yurbrainClient]
  );

  return { loadItems: searchItems, searchItems };
}
