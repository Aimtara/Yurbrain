import { useCallback, useEffect, useState } from "react";
import type { YurbrainClient } from "@yurbrain/client";

import type { FounderReviewActionModel, FounderReviewModel } from "./types";

type UseFounderReviewControllerInput = {
  yurbrainClient: YurbrainClient;
  activeSurface: "feed" | "item" | "session" | "time" | "me" | "founder_review";
  onRunAction: (action: FounderReviewActionModel) => Promise<{ notice: string }>;
};

export function useFounderReviewController({
  yurbrainClient,
  activeSurface,
  onRunAction
}: UseFounderReviewControllerInput) {
  const [review, setReview] = useState<FounderReviewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAiReadout, setLoadingAiReadout] = useState(false);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");

  const loadFounderReview = useCallback(async (includeAiReadout = false) => {
    setLoading(true);
    setLoadingAiReadout(includeAiReadout);
    setError("");
    try {
      const data = await yurbrainClient.getFounderReview<FounderReviewModel>({
        window: "7d",
        userId: currentUserId || undefined,
        includeAi: includeAiReadout
      });
      setReview(data);
    } catch {
      setReview(null);
      setError("Founder Review could not load right now.");
    } finally {
      setLoading(false);
      setLoadingAiReadout(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const currentUser = await yurbrainClient.getCurrentUser<{ id: string }>();
        if (!mounted) return;
        setCurrentUserId(currentUser.id);
      } catch {
        if (!mounted) return;
        setCurrentUserId("");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [yurbrainClient]);

  useEffect(() => {
    if (activeSurface !== "founder_review") return;
    void loadFounderReview();
  }, [activeSurface, currentUserId, loadFounderReview]);

  const applyAction = useCallback(
    async (action: FounderReviewActionModel) => {
      const outcome = await onRunAction(action);
      setActionNotice(outcome.notice);
    },
    [onRunAction]
  );

  return {
    founderReview: review,
    founderReviewLoading: loading,
    founderReviewAiReadoutLoading: loadingAiReadout,
    founderReviewError: error,
    founderReviewActionNotice: actionNotice,
    loadFounderReview,
    applyFounderReviewAction: applyAction
  };
}
