import { useCallback } from "react";
import { createCaptureIntake } from "@yurbrain/client";
import type { CaptureSubmitIntent } from "@yurbrain/ui";

import type { BrainItemDto } from "../shared/types";
import { captureSuccessMessages, userId } from "../shell/constants";

function inferCaptureType(content: string): "text" | "link" | "image" {
  const normalized = content.trim();
  if (/^https?:\/\//i.test(normalized)) {
    if (/\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(normalized)) {
      return "image";
    }
    return "link";
  }
  return "text";
}

type UseCaptureControllerInput = {
  captureDraft: string;
  activeLens: import("@yurbrain/ui").FeedLens;
  setCaptureDraft: (draft: string) => void;
  setCaptureSheetOpen: (open: boolean) => void;
  setCaptureLoading: (loading: boolean) => void;
  setCaptureError: (error: string) => void;
  setCaptureStatusNotice: (notice: string) => void;
  setCaptureSuccessNotice: (notice: string) => void;
  setItems: (updater: BrainItemDto[] | ((current: BrainItemDto[]) => BrainItemDto[])) => void;
  setSelectedItemId: (itemId: string) => void;
  setSelectedTaskId: (taskId: string) => void;
  setActiveSurface: (surface: "feed" | "item" | "session" | "time" | "me") => void;
  setLastAction: (action: string) => void;
  runConvert: (input: { itemId: string; content: string; sourceMessageId?: string }) => Promise<import("../shared/types").TaskDto | null>;
  loadFeed: (lens: import("@yurbrain/ui").FeedLens) => Promise<void>;
  loadTasks: () => Promise<void>;
};

export function useCaptureController({
  captureDraft,
  activeLens,
  setCaptureDraft,
  setCaptureSheetOpen,
  setCaptureLoading,
  setCaptureError,
  setCaptureStatusNotice,
  setCaptureSuccessNotice,
  setItems,
  setSelectedItemId,
  setSelectedTaskId,
  setActiveSurface,
  setLastAction,
  runConvert,
  loadFeed,
  loadTasks
}: UseCaptureControllerInput) {
  const captureItem = useCallback(
    async (intent: CaptureSubmitIntent = "save") => {
      const normalized = captureDraft.trim();
      if (!normalized) return;
      setCaptureLoading(true);
      setCaptureError("");
      setCaptureStatusNotice("");
      const captureType = inferCaptureType(normalized);

      try {
        const intake = await createCaptureIntake<{ itemId: string; item: BrainItemDto }>({
          userId,
          type: captureType,
          content: normalized,
          source: "Web capture sheet"
        });
        const created = intake.item;
        setCaptureDraft("");
        setItems((current) => [created, ...current.filter((item) => item.id !== created.id)]);
        setSelectedItemId(created.id);
        setLastAction("Captured a new note.");
        await Promise.all([loadFeed(activeLens), loadTasks()]);

        if (intent === "save_and_plan") {
          const plannedTask = await runConvert({ itemId: created.id, content: created.rawContent });
          if (plannedTask) {
            setSelectedTaskId(plannedTask.id);
            setActiveSurface("session");
          } else {
            setCaptureStatusNotice("Plan preview is currently lightweight. Review conversion guidance and continue from feed.");
          }
        }

        if (intent === "save_and_remind") {
          setCaptureStatusNotice("Remind Later flow is currently a stub. Your capture is saved and can be snoozed from the feed.");
        }

        const successMessage = captureSuccessMessages[intent];
        setCaptureSuccessNotice(successMessage);
        window.setTimeout(() => {
          setCaptureSheetOpen(false);
          setCaptureSuccessNotice("");
        }, 750);
      } catch {
        setCaptureError("Capture failed. Retry.");
      } finally {
        setCaptureLoading(false);
      }
    },
    [
      activeLens,
      captureDraft,
      loadFeed,
      loadTasks,
      runConvert,
      setActiveSurface,
      setCaptureDraft,
      setCaptureError,
      setCaptureLoading,
      setCaptureSheetOpen,
      setCaptureStatusNotice,
      setCaptureSuccessNotice,
      setItems,
      setLastAction,
      setSelectedItemId,
      setSelectedTaskId
    ]
  );

  const openCaptureSheet = useCallback(() => {
    setCaptureError("");
    setCaptureStatusNotice("");
    setCaptureSuccessNotice("");
    setCaptureSheetOpen(true);
  }, [setCaptureError, setCaptureSheetOpen, setCaptureStatusNotice, setCaptureSuccessNotice]);

  const handleVoiceCaptureStub = useCallback(() => {
    setCaptureStatusNotice("Voice capture is a placeholder for now. Type your thought and save.");
  }, [setCaptureStatusNotice]);

  return {
    captureItem,
    openCaptureSheet,
    handleVoiceCaptureStub
  };
}
