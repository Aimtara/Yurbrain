import { useCallback, useEffect, useState } from "react";
import { yurbrainDomainClient } from "@yurbrain/client";

import type { FounderReviewActionModel, FounderReviewModel } from "./types";

const founderReviewUserId = "11111111-1111-1111-1111-111111111111";

type UseFounderReviewControllerInput = {
  activeSurface: "feed" | "item" | "session" | "time" | "me" | "founder_review";
  onRunAction: (action: FounderReviewActionModel) => Promise<{ notice: string }>;
};

export function useFounderReviewController({
  activeSurface,
  onRunAction
}: UseFounderReviewControllerInput) {
  const [review, setReview] = useState<FounderReviewModel | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingAiReadout, setLoadingAiReadout] = useState(false);
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const loadFounderReview = useCallback(async (includeAiReadout = false) => {
    setLoading(true);
    setLoadingAiReadout(includeAiReadout);
    setError("");
    try {
      const data = await yurbrainDomainClient.getFounderReview<FounderReviewModel>({
        window: "7d",
        userId: founderReviewUserId,
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
  }, []);

  useEffect(() => {
    if (activeSurface !== "founder_review") return;
    void loadFounderReview();
  }, [activeSurface, loadFounderReview]);

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
