import { useCallback } from "react";
import { type YurbrainClient } from "@yurbrain/client";

import type { BrainItemDto } from "../shared/types";

type UseBrainItemsControllerInput = {
  yurbrainClient: YurbrainClient;
  selectedItemId: string;
  setItems: (items: BrainItemDto[]) => void;
  setCaptureError: (error: string) => void;
  setSelectedItemId: (itemId: string) => void;
};

export function useBrainItemsController({
  yurbrainClient,
  selectedItemId,
  setItems,
  setCaptureError,
  setSelectedItemId
}: UseBrainItemsControllerInput) {
  const loadItems = useCallback(async () => {
    try {
      const response = await yurbrainClient.listBrainItems<BrainItemDto[]>();
      const nextItems = [...response].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setItems(nextItems);
      setCaptureError("");
      if (nextItems.length === 0) {
        setSelectedItemId("");
        return;
      }
      if (!nextItems.some((item) => item.id === selectedItemId)) {
        setSelectedItemId(nextItems[0].id);
      }
    } catch {
      setCaptureError("Could not load captured items.");
    }
  }, [selectedItemId, setCaptureError, setItems, setSelectedItemId, yurbrainClient]);

  return { loadItems };
}
