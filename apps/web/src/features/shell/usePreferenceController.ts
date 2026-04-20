import { useCallback } from "react";
import type { YurbrainClient } from "@yurbrain/client";

import type { UserPreferenceDto } from "../shared/types";

type UsePreferenceControllerInput = {
  hydrated: boolean;
  yurbrainClient: YurbrainClient;
  setActiveLens: (lens: UserPreferenceDto["defaultLens"]) => void;
  setFounderMode: (enabled: boolean) => void;
  setRenderMode: (mode: UserPreferenceDto["renderMode"]) => void;
  setAiSummaryMode: (mode: UserPreferenceDto["aiSummaryMode"]) => void;
  setFeedDensity: (density: UserPreferenceDto["feedDensity"]) => void;
  setResurfacingIntensity: (intensity: UserPreferenceDto["resurfacingIntensity"]) => void;
  setPersonalizationNotice: (notice: string) => void;
};

export function usePreferenceController({
  hydrated,
  yurbrainClient,
  setActiveLens,
  setFounderMode,
  setRenderMode,
  setAiSummaryMode,
  setFeedDensity,
  setResurfacingIntensity,
  setPersonalizationNotice
}: UsePreferenceControllerInput) {
  const persistUserPreferences = useCallback(
    async (
      updates: Partial<
        Pick<UserPreferenceDto, "defaultLens" | "founderMode" | "renderMode" | "aiSummaryMode" | "feedDensity" | "resurfacingIntensity">
      >
    ) => {
      try {
        if (updates.founderMode !== undefined) {
          await yurbrainClient.setFounderMode<UserPreferenceDto>(updates.founderMode);
        }
        if (updates.defaultLens !== undefined) {
          await yurbrainClient.setDefaultFeedLens<UserPreferenceDto>(updates.defaultLens);
        }
        const remainingUpdates: Partial<
          Pick<UserPreferenceDto, "renderMode" | "aiSummaryMode" | "feedDensity" | "resurfacingIntensity">
        > = {};
        if (updates.renderMode !== undefined) remainingUpdates.renderMode = updates.renderMode;
        if (updates.aiSummaryMode !== undefined) remainingUpdates.aiSummaryMode = updates.aiSummaryMode;
        if (updates.feedDensity !== undefined) remainingUpdates.feedDensity = updates.feedDensity;
        if (updates.resurfacingIntensity !== undefined) remainingUpdates.resurfacingIntensity = updates.resurfacingIntensity;
        if (Object.keys(remainingUpdates).length > 0) {
          await yurbrainClient.updateUserPreferenceMe<UserPreferenceDto>(remainingUpdates);
        }
      } catch {
        // Preference persistence should not block core loop actions.
      }
    },
    [yurbrainClient]
  );

  const loadUserPreferences = useCallback(async () => {
    try {
      const preferences = await yurbrainClient.getUserPreferenceMe<UserPreferenceDto>();
      setActiveLens(preferences.defaultLens);
      setFounderMode(preferences.founderMode);
      setRenderMode(preferences.renderMode);
      setAiSummaryMode(preferences.aiSummaryMode);
      setFeedDensity(preferences.feedDensity);
      setResurfacingIntensity(preferences.resurfacingIntensity);
      return preferences.defaultLens;
    } catch {
      return null;
    }
  }, [setActiveLens, setAiSummaryMode, setFeedDensity, setFounderMode, setRenderMode, setResurfacingIntensity, yurbrainClient]);

  const handleLensChange = useCallback(
    (nextLens: UserPreferenceDto["defaultLens"]) => {
      setActiveLens(nextLens);
      if (hydrated) {
        void persistUserPreferences({ defaultLens: nextLens });
      }
    },
    [hydrated, persistUserPreferences, setActiveLens]
  );

  const handleFounderModeToggle = useCallback(
    (enabled: boolean) => {
      setFounderMode(enabled);
      if (hydrated) {
        void persistUserPreferences({ founderMode: enabled });
      }
    },
    [hydrated, persistUserPreferences, setFounderMode]
  );

  const handleRenderModeChange = useCallback(
    (nextMode: UserPreferenceDto["renderMode"]) => {
      setRenderMode(nextMode);
      setPersonalizationNotice(nextMode === "focus" ? "Focus mode stays the default surface." : "Explore mode preference saved for future rendering.");
      if (hydrated) {
        void persistUserPreferences({ renderMode: nextMode });
      }
    },
    [hydrated, persistUserPreferences, setPersonalizationNotice, setRenderMode]
  );

  const handleAiSummaryModeChange = useCallback(
    (nextMode: UserPreferenceDto["aiSummaryMode"]) => {
      setAiSummaryMode(nextMode);
      setPersonalizationNotice(`AI summary mode set to ${nextMode}.`);
      if (hydrated) {
        void persistUserPreferences({ aiSummaryMode: nextMode });
      }
    },
    [hydrated, persistUserPreferences, setAiSummaryMode, setPersonalizationNotice]
  );

  const handleFeedDensityChange = useCallback(
    (nextDensity: UserPreferenceDto["feedDensity"]) => {
      setFeedDensity(nextDensity);
      setPersonalizationNotice(`Feed density set to ${nextDensity}.`);
      if (hydrated) {
        void persistUserPreferences({ feedDensity: nextDensity });
      }
    },
    [hydrated, persistUserPreferences, setFeedDensity, setPersonalizationNotice]
  );

  const handleResurfacingIntensityChange = useCallback(
    (nextIntensity: UserPreferenceDto["resurfacingIntensity"]) => {
      setResurfacingIntensity(nextIntensity);
      setPersonalizationNotice(`Resurfacing intensity set to ${nextIntensity}.`);
      if (hydrated) {
        void persistUserPreferences({ resurfacingIntensity: nextIntensity });
      }
    },
    [hydrated, persistUserPreferences, setPersonalizationNotice, setResurfacingIntensity]
  );

  return {
    loadUserPreferences,
    handleLensChange,
    handleFounderModeToggle,
    handleRenderModeChange,
    handleAiSummaryModeChange,
    handleFeedDensityChange,
    handleResurfacingIntensityChange
  };
}
