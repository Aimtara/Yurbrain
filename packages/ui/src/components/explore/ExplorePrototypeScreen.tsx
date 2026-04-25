import React from "react";
import { tokens } from "../../design/tokens";

export type ExploreConnectionMode = "pattern" | "idea" | "plan" | "question";

export type ExploreSourceCard = {
  id: string;
  title: string;
  preview: string;
  selected: boolean;
};

export type ExploreCandidate = {
  title: string;
  summary: string;
  whyTheseConnect: string[];
  suggestedNextActions: string[];
  confidence: number;
};

type Props = {
  sourceCards: ExploreSourceCard[];
  selectedCount: number;
  mode: ExploreConnectionMode;
  candidates: ExploreCandidate[];
  selectedCandidateIndex: number;
  loading?: boolean;
  saving?: boolean;
  errorMessage?: string;
  notice?: string;
  onBackToFocus: () => void;
  onToggleCard: (itemId: string) => void;
  onModeChange: (mode: ExploreConnectionMode) => void;
  onPreview: () => void;
  onSelectCandidate: (index: number) => void;
  onSave: () => void;
  onPlan: () => void;
  onDismiss: () => void;
};

const modeLabels: Record<ExploreConnectionMode, string> = {
  pattern: "Pattern",
  idea: "Idea",
  plan: "Plan",
  question: "Question"
};

const modeDescriptions: Record<ExploreConnectionMode, string> = {
  pattern: "What do these have in common?",
  idea: "What could this become?",
  plan: "What should I do with this?",
  question: "What should I think about next?"
};

export function ExplorePrototypeScreen({
  sourceCards,
  selectedCount,
  mode,
  candidates,
  selectedCandidateIndex,
  loading = false,
  saving = false,
  errorMessage,
  notice,
  onBackToFocus,
  onToggleCard,
  onModeChange,
  onPreview,
  onSelectCandidate,
  onSave,
  onPlan,
  onDismiss
}: Props) {
  const activeCandidate = candidates[selectedCandidateIndex] ?? candidates[0] ?? null;
  const canPreview = selectedCount >= 2 && selectedCount <= 5 && !loading;
  const selectedCards = sourceCards.filter((card) => card.selected);

  return (
    <section
      aria-label="Explore mode prototype"
      style={{
        margin: "24px auto 0",
        maxWidth: "1080px",
        padding: "0 16px",
        display: "grid",
        gap: `${tokens.space.md}px`
      }}
    >
      <div style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <p style={eyebrowStyle}>Explore</p>
            <h1 style={{ margin: 0, fontSize: "30px", lineHeight: "36px" }}>Make a connection</h1>
            <p style={{ margin: "8px 0 0", color: tokens.colors.muted }}>
              Add 2–5 cards. Yurbrain will suggest one possible connection, grounded in your sources.
            </p>
          </div>
          <button type="button" onClick={onBackToFocus} style={secondaryButtonStyle}>
            Back to Focus
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 0.85fr) minmax(0, 1.3fr) minmax(280px, 0.9fr)", gap: "16px" }}>
        <aside style={panelStyle}>
          <p style={eyebrowStyle}>Card tray</p>
          <h2 style={sectionTitleStyle}>Recent and related cards</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            {sourceCards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => onToggleCard(card.id)}
                aria-pressed={card.selected}
                style={{
                  textAlign: "left",
                  borderRadius: "16px",
                  border: `1px solid ${card.selected ? "#93c5fd" : tokens.colors.border}`,
                  background: card.selected ? tokens.colors.accentSurface : "#ffffff",
                  padding: "12px",
                  display: "grid",
                  gap: "6px"
                }}
              >
                <strong>{card.title}</strong>
                <span style={{ color: tokens.colors.muted, fontSize: "13px" }}>{card.preview}</span>
              </button>
            ))}
          </div>
        </aside>

        <section style={panelStyle}>
          <p style={eyebrowStyle}>Workspace</p>
          <h2 style={sectionTitleStyle}>
            {selectedCount === 0
              ? "Drop a few cards here."
              : selectedCount === 1
                ? "Add another card to make a connection."
                : "These might connect."}
          </h2>
          <p style={{ margin: 0, color: tokens.colors.muted }}>
            {selectedCount === 0
              ? "Yurbrain will help you find what connects them."
              : selectedCount === 1
                ? "Try something related, surprising, or unresolved."
                : "Choose how you want Yurbrain to look at them."}
          </p>

          <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
            {selectedCards.map((card) => (
              <article key={card.id} style={{ borderRadius: "18px", border: `1px solid ${tokens.colors.border}`, background: "#ffffff", padding: "14px" }}>
                <p style={{ margin: 0, fontWeight: 700 }}>{card.title}</p>
                <p style={{ margin: "6px 0 0", color: tokens.colors.muted }}>{card.preview}</p>
              </article>
            ))}
          </div>
        </section>

        <aside style={panelStyle}>
          <p style={eyebrowStyle}>Inspector</p>
          <h2 style={sectionTitleStyle}>Connection mode</h2>
          <div style={{ display: "grid", gap: "8px" }}>
            {(Object.keys(modeLabels) as ExploreConnectionMode[]).map((candidateMode) => (
              <button
                key={candidateMode}
                type="button"
                onClick={() => onModeChange(candidateMode)}
                aria-pressed={mode === candidateMode}
                style={{
                  ...secondaryButtonStyle,
                  borderColor: mode === candidateMode ? "#93c5fd" : "#cbd5e1",
                  background: mode === candidateMode ? tokens.colors.accentSurface : "#ffffff",
                  textAlign: "left"
                }}
              >
                <strong>{modeLabels[candidateMode]}</strong>
                <br />
                <span style={{ color: tokens.colors.muted }}>{modeDescriptions[candidateMode]}</span>
              </button>
            ))}
          </div>

          <button type="button" onClick={onPreview} disabled={!canPreview} style={{ ...primaryButtonStyle, marginTop: "14px", opacity: canPreview ? 1 : 0.55 }}>
            {loading ? "Looking for the thread…" : "Find connection"}
          </button>
          {errorMessage ? <p style={{ margin: "10px 0 0", color: "#991b1b" }}>{errorMessage}</p> : null}
          {notice ? <p style={{ margin: "10px 0 0", color: tokens.colors.success }}>{notice}</p> : null}
        </aside>
      </div>

      {activeCandidate ? (
        <section style={panelStyle} aria-label="Connection preview">
          <p style={eyebrowStyle}>Yurbrain noticed a possible connection</p>
          <h2 style={{ margin: 0 }}>{activeCandidate.title}</h2>
          <p style={{ margin: "8px 0 0", color: "#334155", lineHeight: 1.5 }}>{activeCandidate.summary}</p>
          <p style={{ margin: "8px 0 0", color: tokens.colors.muted }}>Confidence: {Math.round(activeCandidate.confidence * 100)}%</p>

          <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "1fr 1fr", marginTop: "14px" }}>
            <div>
              <h3 style={smallHeadingStyle}>Why these connect</h3>
              <ul>
                {activeCandidate.whyTheseConnect.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 style={smallHeadingStyle}>Next moves</h3>
              <ul>
                {activeCandidate.suggestedNextActions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </div>
          </div>

          {candidates.length > 1 ? (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "12px" }}>
              {candidates.map((candidate, index) => (
                <button key={candidate.title} type="button" onClick={() => onSelectCandidate(index)} style={secondaryButtonStyle}>
                  Angle {index + 1}
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "14px" }}>
            <button type="button" onClick={onSave} disabled={saving} style={primaryButtonStyle}>
              {saving ? "Saving…" : "Save Connection"}
            </button>
            <button type="button" onClick={onPlan} style={secondaryButtonStyle}>
              Plan this
            </button>
            <button type="button" onClick={onPreview} style={secondaryButtonStyle}>
              Try another angle
            </button>
            <button type="button" onClick={onDismiss} style={secondaryButtonStyle}>
              Dismiss
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}

const panelStyle: React.CSSProperties = {
  borderRadius: `${tokens.radius.lg}px`,
  border: `1px solid ${tokens.colors.border}`,
  background: "#ffffff",
  padding: `${tokens.space.md}px`
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontSize: "12px",
  fontWeight: 700,
  color: tokens.colors.accent
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "4px 0 8px",
  fontSize: "20px",
  lineHeight: "26px"
};

const smallHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "15px",
  lineHeight: "22px"
};

const primaryButtonStyle: React.CSSProperties = {
  border: "1px solid #1d4ed8",
  background: "#dbeafe",
  borderRadius: "999px",
  padding: "9px 14px",
  fontWeight: 700
};

const secondaryButtonStyle: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  background: "#ffffff",
  borderRadius: "14px",
  padding: "8px 12px"
};
