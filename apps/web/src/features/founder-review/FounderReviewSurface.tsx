import type {
  FounderReviewActionModel,
  FounderReviewDiagnosticsModel,
  FounderReviewModel
} from "./types";

type FounderReviewSurfaceProps = {
  review: FounderReviewModel | null;
  diagnostics: FounderReviewDiagnosticsModel | null;
  loading: boolean;
  loadingAiReadout?: boolean;
  loadingDiagnostics?: boolean;
  error: string;
  onRefresh: () => void;
  onRefreshWithAiReadout?: () => void;
  onRunAction: (action: FounderReviewActionModel) => void;
  actionNotice?: string;
};

function scoreColor(score: number): string {
  if (score >= 75) return "#065f46";
  if (score >= 55) return "#92400e";
  return "#991b1b";
}

export function FounderReviewSurface({
  review,
  diagnostics,
  loading,
  loadingAiReadout = false,
  loadingDiagnostics = false,
  error,
  onRefresh,
  onRefreshWithAiReadout,
  onRunAction,
  actionNotice = ""
}: FounderReviewSurfaceProps) {
  if (!review) {
    return (
      <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
        <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "8px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Founder Review</h2>
              <p style={{ margin: "6px 0 0", color: "#475569" }}>A calm read on loop health and where to focus next.</p>
            </div>
            <button type="button" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing..." : "Load review"}
            </button>
            {onRefreshWithAiReadout ? (
              <button type="button" onClick={onRefreshWithAiReadout} disabled={loadingAiReadout || loading}>
                {loadingAiReadout ? "Generating AI readout..." : "Generate AI readout (optional)"}
              </button>
            ) : null}
          </div>
          {error ? <p style={{ margin: 0, color: "#991b1b" }}>{error}</p> : <p style={{ margin: 0, color: "#475569" }}>No review model yet.</p>}
        </div>
      </section>
    );
  }

  return (
    <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "8px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>{review.header.title}</h2>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{review.header.subtitle}</p>
          </div>
          <button type="button" onClick={onRefresh} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh review"}
          </button>
          {onRefreshWithAiReadout ? (
            <button type="button" onClick={onRefreshWithAiReadout} disabled={loadingAiReadout || loading}>
              {loadingAiReadout ? "Generating AI readout..." : "Generate AI readout (optional)"}
            </button>
          ) : null}
        </div>
        {error ? <p style={{ margin: 0, color: "#991b1b" }}>{error}</p> : null}
        {actionNotice ? <p style={{ margin: 0, color: "#334155" }}>{actionNotice}</p> : null}
      </div>
      {review.aiReadout ? (
        <div style={{ borderRadius: "20px", border: "1px solid #dbeafe", background: "#eff6ff", padding: "16px", display: "grid", gap: "8px" }}>
          <h3 style={{ margin: 0, fontSize: "17px", lineHeight: "22px", color: "#1e3a8a" }}>AI Readout (optional)</h3>
          <p style={{ margin: 0, color: "#1e3a8a" }}>{review.aiReadout.summary}</p>
          <p style={{ margin: 0, color: "#1e3a8a" }}>
            <strong>Suggested wording:</strong> {review.aiReadout.recommendedNextMoveWording}
          </p>
          <p style={{ margin: 0, fontSize: "12px", color: "#1d4ed8" }}>
            {review.aiReadout.groundingNote}
          </p>
        </div>
      ) : null}

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Diagnostics (actionable)</h3>
        {loadingDiagnostics ? <p style={{ margin: 0, color: "#475569" }}>Loading diagnostics...</p> : null}
        {diagnostics ? (
          <>
            <p style={{ margin: 0, color: "#475569" }}>
              Items: {diagnostics.summary.itemCount} · Tasks: {diagnostics.summary.taskCount} · Sessions: {diagnostics.summary.sessionCount}
            </p>
            <p style={{ margin: 0, color: "#475569" }}>
              Blocked: {diagnostics.summary.blockedCount} · Stale: {diagnostics.summary.staleCount} · Continuation gaps:{" "}
              {diagnostics.summary.continuationGapCount}
            </p>
            {diagnostics.focusItems.length > 0 ? (
              <div style={{ display: "grid", gap: "8px" }}>
                {diagnostics.focusItems.map((focus) => (
                  <button key={focus.itemId} type="button" onClick={() => onRunAction(focus.action)} style={{ textAlign: "left" }}>
                    {focus.title} — {focus.detail}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ margin: 0, color: "#475569" }}>No urgent item-level focus candidates right now.</p>
            )}
            <div style={{ display: "grid", gap: "8px" }}>
              {diagnostics.focusActions.map((action) => (
                <button key={action.id} type="button" onClick={() => onRunAction(action)} style={{ textAlign: "left" }}>
                  {action.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <p style={{ margin: 0, color: "#475569" }}>Diagnostics unavailable.</p>
        )}
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Overall score strip</h3>
        <div style={{ display: "grid", gap: "10px", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
          {[review.overview.overallProduct, review.overview.web, review.overview.mobile, review.overview.crossPlatform].map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => onRunAction(entry.action)}
              style={{ borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px", textAlign: "left", cursor: "pointer" }}
            >
              <p style={{ margin: 0, color: "#64748b", fontSize: "13px", fontWeight: 600 }}>{entry.label}</p>
              <p style={{ margin: "6px 0 0", color: scoreColor(entry.score), fontSize: "24px", fontWeight: 800 }}>{entry.score}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Loop Health</h3>
        <div style={{ display: "grid", gap: "8px", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
          {review.loopHealth.map((entry: FounderReviewModel["loopHealth"][number]) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => onRunAction(entry.action)}
              style={{ borderRadius: "12px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "10px", textAlign: "left", cursor: "pointer" }}
            >
              <p style={{ margin: 0, color: "#64748b", fontSize: "12px", fontWeight: 600 }}>{entry.label}</p>
              <p style={{ margin: "4px 0 0", color: scoreColor(entry.score), fontSize: "20px", fontWeight: 700 }}>{entry.score}</p>
            </button>
          ))}
        </div>
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Current Readout</h3>
        <div style={{ display: "grid", gap: "8px" }}>
          <button type="button" onClick={() => onRunAction(review.currentReadout.strongestArea.action)} style={{ textAlign: "left" }}>
            Strongest area: {review.currentReadout.strongestArea.label} ({review.currentReadout.strongestArea.score})
          </button>
          <button type="button" onClick={() => onRunAction(review.currentReadout.weakestArea.action)} style={{ textAlign: "left" }}>
            Weakest area: {review.currentReadout.weakestArea.label} ({review.currentReadout.weakestArea.score})
          </button>
          <button type="button" onClick={() => onRunAction(review.currentReadout.mainRisk.action)} style={{ textAlign: "left" }}>
            Main risk: {review.currentReadout.mainRisk.title}
          </button>
          <button type="button" onClick={() => onRunAction(review.currentReadout.recommendedNextMove.action)} style={{ textAlign: "left" }}>
            Recommended next move: {review.currentReadout.recommendedNextMove.title}
          </button>
          <p style={{ margin: 0, color: "#475569" }}>{review.currentReadout.recommendedNextMove.detail}</p>
        </div>
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Founder Execution Summary</h3>
        <p style={{ margin: 0 }}>
          Active work: {review.founderExecutionSummary.activeWork} · Blocked: {review.founderExecutionSummary.blocked} · Stale:{" "}
          {review.founderExecutionSummary.stale}
        </p>
        {review.founderExecutionSummary.suggestedNextFocus ? (
          <button type="button" onClick={() => onRunAction(review.founderExecutionSummary.suggestedNextFocus!.action)} style={{ textAlign: "left" }}>
            Suggested next focus: {review.founderExecutionSummary.suggestedNextFocus.title}
          </button>
        ) : null}
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Cross-Platform Continuity</h3>
        {[review.crossPlatformContinuity.mobileToWeb, review.crossPlatformContinuity.webToMobile, review.crossPlatformContinuity.feedConsistency, review.crossPlatformContinuity.stateContinuity].map(
          (entry) => (
            <button key={entry.key} type="button" onClick={() => onRunAction(entry.action)} style={{ textAlign: "left" }}>
              {entry.label}: {entry.score}
            </button>
          )
        )}
        <p style={{ margin: 0, color: "#475569" }}>{review.crossPlatformContinuity.signalNote}</p>
      </div>

      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Risk Flags</h3>
        {review.riskFlags.length === 0 ? <p style={{ margin: 0, color: "#475569" }}>No critical flags this window.</p> : null}
        {review.riskFlags.map((flag: FounderReviewModel["riskFlags"][number]) => (
          <button key={flag.id} type="button" onClick={() => onRunAction(flag.action)} style={{ textAlign: "left" }}>
            {flag.severity.toUpperCase()}: {flag.title} — {flag.detail}
          </button>
        ))}
      </div>
    </section>
  );
}
