import { useCallback } from "react";
import { createCaptureIntake } from "@yurbrain/client";
import type { CaptureSubmitIntent } from "@yurbrain/ui";

import type { BrainItemDto, CaptureDraft } from "../shared/types";
import { captureSuccessMessages, userId } from "../shell/constants";

type UseCaptureControllerInput = {
  captureDraft: CaptureDraft;
  activeLens: import("@yurbrain/ui").FeedLens;
  setCaptureDraft: (draft: CaptureDraft) => void;
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

type CaptureIntakeResponse = {
  item: BrainItemDto;
  preview: {
    title: string;
    snippet: string;
    contentType: "text" | "link" | "image";
  };
  itemId: string;
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
  const resetCaptureDraft = useCallback(() => {
    setCaptureDraft({
      type: "text",
      content: "",
      source: "",
      note: ""
    });
  }, [setCaptureDraft]);

  const captureItem = useCallback(
    async (intent: CaptureSubmitIntent = "save") => {
      const normalized = captureDraft.content.trim();
      if (!normalized) return;
      setCaptureLoading(true);
      setCaptureError("");
      setCaptureStatusNotice("");

      try {
        const intake = await createCaptureIntake<CaptureIntakeResponse>({
          userId,
          type: captureDraft.type,
          content: normalized,
          source: captureDraft.source.trim() || "web_capture_sheet",
          note: captureDraft.note.trim() || undefined
        });
        const created = intake.item;
        resetCaptureDraft();
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
          setCaptureStatusNotice("Saved for deferred resurfacing. Yurbrain will bring this back with related context.");
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
      resetCaptureDraft,
      runConvert,
      setActiveSurface,
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
    resetCaptureDraft();
    setCaptureSheetOpen(true);
  }, [resetCaptureDraft, setCaptureError, setCaptureSheetOpen, setCaptureStatusNotice, setCaptureSuccessNotice]);

  const handleVoiceCaptureStub = useCallback(() => {
    setCaptureStatusNotice("Voice capture is a placeholder for now. Type your thought and save.");
  }, [setCaptureStatusNotice]);

  return {
    captureItem,
    openCaptureSheet,
    handleVoiceCaptureStub
  };
}
