import { useEffect, useState } from "react";
import type { ExecutionLens, FeedLens, TimeWindowOption } from "@yurbrain/ui";

import type { Surface, UserPreferenceDto } from "../shared/types";
import { storageKeys } from "./constants";

const validFeedLenses: FeedLens[] = ["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"];
const validExecutionLenses: ExecutionLens[] = ["all", "ready_to_move", "needs_unblock", "momentum"];
const validSurfaces: Surface[] = ["feed", "item", "session", "time", "me", "founder_review", "explore"];
const validRenderModes: Array<UserPreferenceDto["renderMode"]> = ["focus", "explore"];
const validAiSummaryModes: Array<UserPreferenceDto["aiSummaryMode"]> = ["concise", "balanced", "detailed"];
const validFeedDensity: Array<UserPreferenceDto["feedDensity"]> = ["comfortable", "compact"];
const validResurfacingIntensity: Array<UserPreferenceDto["resurfacingIntensity"]> = ["gentle", "balanced", "active"];
const validTimeWindows: TimeWindowOption[] = ["2h", "4h", "6h", "8h", "24h", "custom"];

function includesValue<T extends string>(value: string | null, options: readonly T[]): value is T {
  return value !== null && options.includes(value as T);
}

export function useAppShellState() {
  const [hydrated, setHydrated] = useState(false);
  const [activeLens, setActiveLens] = useState<FeedLens>("all");
  const [executionLens, setExecutionLens] = useState<ExecutionLens>("all");
  const [founderMode, setFounderMode] = useState(false);
  const [renderMode, setRenderMode] = useState<UserPreferenceDto["renderMode"]>("focus");
  const [aiSummaryMode, setAiSummaryMode] = useState<UserPreferenceDto["aiSummaryMode"]>("balanced");
  const [feedDensity, setFeedDensity] = useState<UserPreferenceDto["feedDensity"]>("comfortable");
  const [resurfacingIntensity, setResurfacingIntensity] = useState<UserPreferenceDto["resurfacingIntensity"]>("balanced");
  const [activeSurface, setActiveSurface] = useState<Surface>("feed");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [timeWindow, setTimeWindow] = useState<TimeWindowOption>("4h");
  const [customWindowMinutes, setCustomWindowMinutes] = useState(180);

  useEffect(() => {
    const storedLens = window.localStorage.getItem(storageKeys.activeLens);
    if (includesValue(storedLens, validFeedLenses)) {
      setActiveLens(storedLens);
    }

    const storedExecutionLens = window.localStorage.getItem(storageKeys.executionLens);
    if (includesValue(storedExecutionLens, validExecutionLenses)) {
      setExecutionLens(storedExecutionLens);
    }

    const storedSurface = window.localStorage.getItem(storageKeys.activeSurface);
    if (includesValue(storedSurface, validSurfaces)) {
      setActiveSurface(storedSurface);
    }

    const storedFounderMode = window.localStorage.getItem(storageKeys.founderMode);
    setFounderMode(storedFounderMode === "1");

    const storedRenderMode = window.localStorage.getItem(storageKeys.renderMode);
    if (includesValue(storedRenderMode, validRenderModes)) {
      setRenderMode(storedRenderMode);
    }

    const storedAiSummaryMode = window.localStorage.getItem(storageKeys.aiSummaryMode);
    if (includesValue(storedAiSummaryMode, validAiSummaryModes)) {
      setAiSummaryMode(storedAiSummaryMode);
    }

    const storedFeedDensity = window.localStorage.getItem(storageKeys.feedDensity);
    if (includesValue(storedFeedDensity, validFeedDensity)) {
      setFeedDensity(storedFeedDensity);
    }

    const storedResurfacingIntensity = window.localStorage.getItem(storageKeys.resurfacingIntensity);
    if (includesValue(storedResurfacingIntensity, validResurfacingIntensity)) {
      setResurfacingIntensity(storedResurfacingIntensity);
    }

    setSelectedItemId(window.localStorage.getItem(storageKeys.selectedItemId) ?? "");
    setSelectedTaskId(window.localStorage.getItem(storageKeys.selectedTaskId) ?? "");

    const storedTimeWindow = window.localStorage.getItem(storageKeys.timeWindow);
    if (includesValue(storedTimeWindow, validTimeWindows)) {
      setTimeWindow(storedTimeWindow);
    }

    const storedCustomWindowMinutes = Number.parseInt(window.localStorage.getItem(storageKeys.customWindowMinutes) ?? "", 10);
    if (!Number.isNaN(storedCustomWindowMinutes)) {
      setCustomWindowMinutes(Math.max(30, Math.min(1440, storedCustomWindowMinutes)));
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.activeLens, activeLens);
  }, [activeLens, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.executionLens, executionLens);
  }, [executionLens, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.activeSurface, activeSurface);
  }, [activeSurface, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.founderMode, founderMode ? "1" : "0");
  }, [founderMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.renderMode, renderMode);
  }, [hydrated, renderMode]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.aiSummaryMode, aiSummaryMode);
  }, [aiSummaryMode, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.feedDensity, feedDensity);
  }, [feedDensity, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.resurfacingIntensity, resurfacingIntensity);
  }, [hydrated, resurfacingIntensity]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.timeWindow, timeWindow);
  }, [hydrated, timeWindow]);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(storageKeys.customWindowMinutes, String(customWindowMinutes));
  }, [customWindowMinutes, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedItemId) {
      window.localStorage.removeItem(storageKeys.selectedItemId);
      return;
    }
    window.localStorage.setItem(storageKeys.selectedItemId, selectedItemId);
  }, [hydrated, selectedItemId]);

  useEffect(() => {
    if (!hydrated) return;
    if (!selectedTaskId) {
      window.localStorage.removeItem(storageKeys.selectedTaskId);
      return;
    }
    window.localStorage.setItem(storageKeys.selectedTaskId, selectedTaskId);
  }, [hydrated, selectedTaskId]);

  return {
    hydrated,
    activeLens,
    setActiveLens,
    executionLens,
    setExecutionLens,
    founderMode,
    setFounderMode,
    renderMode,
    setRenderMode,
    aiSummaryMode,
    setAiSummaryMode,
    feedDensity,
    setFeedDensity,
    resurfacingIntensity,
    setResurfacingIntensity,
    activeSurface,
    setActiveSurface,
    selectedItemId,
    setSelectedItemId,
    selectedTaskId,
    setSelectedTaskId,
    timeWindow,
    setTimeWindow,
    customWindowMinutes,
    setCustomWindowMinutes
  };
}
