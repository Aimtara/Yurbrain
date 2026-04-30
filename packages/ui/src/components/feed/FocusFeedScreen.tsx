import React from "react";

import { FeedLensBar, type FeedLens } from "./FeedLensBar";

type FocusFeedScreenProps = {
  activeLens: FeedLens;
  lenses: FeedLens[];
  onLensChange: (lens: FeedLens) => void;
  feedContent: React.ReactNode;
  hasCards: boolean;
  loading?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  onReload?: () => void;
  title?: string;
  subtitle?: string;
  reentryMessage?: string;
  founderToggle?: React.ReactNode;
  executionLens?: React.ReactNode;
  captureComposer?: React.ReactNode;
  founderSummary?: React.ReactNode;
};

const styles = {
  shell: {
    margin: "0 auto",
    maxWidth: "960px",
    padding: "24px 16px 48px",
    display: "grid",
    gap: "24px",
    color: "#0f172a"
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "24px",
    padding: "24px"
  },
  headerRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: "12px",
    alignItems: "center"
  },
  title: {
    margin: 0,
    fontSize: "30px",
    lineHeight: "36px",
    fontWeight: 800
  },
  subtitle: {
    margin: "8px 0 0",
    fontSize: "16px",
    lineHeight: "24px",
    color: "#475569"
  },
  reentry: {
    margin: "12px 0 0",
    borderRadius: "16px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    padding: "12px 14px",
    fontSize: "14px",
    lineHeight: "20px",
    color: "#334155"
  },
  cardStack: {
    display: "grid",
    gap: "16px"
  },
  stateCard: {
    background: "#f8fafc",
    border: "1px dashed #cbd5e1",
    borderRadius: "20px",
    padding: "20px"
  }
} satisfies Record<string, React.CSSProperties>;

export function FocusFeedScreen({
  activeLens,
  lenses,
  onLensChange,
  feedContent,
  hasCards,
  loading,
  errorMessage,
  onRetry,
  onReload,
  title = "Focus Feed",
  subtitle = "Capture quickly, find it again, and continue when the thread is ready.",
  reentryMessage,
  founderToggle,
  executionLens,
  captureComposer,
  founderSummary
}: FocusFeedScreenProps) {
  return (
    <section style={styles.shell} aria-label="Focus feed screen">
      <div style={styles.panel}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>{title}</h1>
            <p style={styles.subtitle}>{subtitle}</p>
          </div>
          <div style={styles.headerRow}>
            {onReload ? (
              <button type="button" onClick={onReload}>
                Refresh feed
              </button>
            ) : null}
            {founderToggle}
          </div>
        </div>
        {reentryMessage ? <p style={styles.reentry}>{reentryMessage}</p> : null}
      </div>

      {captureComposer ? <div style={styles.panel}>{captureComposer}</div> : null}

      <div style={{ ...styles.panel, display: "grid", gap: "16px" }}>
        <FeedLensBar lenses={lenses} activeLens={activeLens} onChange={onLensChange} />
        {executionLens}
        <p style={{ margin: 0, fontSize: "14px", lineHeight: "20px", color: "#475569" }}>
          Start with capture and resurfacing. Planning appears only when a saved thread is ready for a concrete next move.
        </p>
        {loading ? <p style={{ margin: 0 }}>Gathering a few thoughts worth resurfacing...</p> : null}
        {errorMessage ? (
          <div style={styles.stateCard}>
            <p style={{ margin: 0, fontWeight: 600 }}>Your feed took a pause.</p>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>{errorMessage}</p>
            {onRetry ? (
              <button type="button" onClick={onRetry} style={{ marginTop: "12px" }}>
                Try again gently
              </button>
            ) : null}
          </div>
        ) : null}
        {!loading && !errorMessage && !hasCards ? (
          <div style={styles.stateCard}>
            <p style={{ margin: 0, fontWeight: 600 }}>This lens is quiet right now.</p>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>
              Capture one thing you may want later. Yurbrain will bring it back here so you can continue without rebuilding context.
            </p>
          </div>
        ) : null}
        {!loading && !errorMessage && hasCards ? <div style={styles.cardStack}>{feedContent}</div> : null}
      </div>

      {founderSummary ? <div style={styles.panel}>{founderSummary}</div> : null}
    </section>
  );
}
