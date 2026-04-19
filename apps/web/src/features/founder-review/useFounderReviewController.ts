import { useCallback, useEffect, useState } from "react";
import { apiClient, endpoints } from "@yurbrain/client";

import { userId } from "../shell/constants";
import type { FounderReviewActionModel, FounderReviewModel } from "./types";

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
  const [error, setError] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  const loadFounderReview = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiClient<FounderReviewModel>(`${endpoints.founderReview}?window=7d&userId=${encodeURIComponent(userId)}`);
      setReview(data);
    } catch {
      setReview(null);
      setError("Founder Review could not load right now.");
    } finally {
      setLoading(false);
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
    founderReviewError: error,
    founderReviewActionNotice: actionNotice,
    loadFounderReview,
    applyFounderReviewAction: applyAction
  };
}
