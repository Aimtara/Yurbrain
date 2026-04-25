export type ConnectionMode = "pattern" | "idea" | "plan" | "question";

export type ConnectionSource = {
  id: string;
  title: string;
  rawContent: string;
  topicGuess?: string | null;
};

export type ConnectionCandidate = {
  title: string;
  summary: string;
  whyTheseConnect: string[];
  suggestedNextActions: string[];
  confidence: number;
  sourceItemIds?: string[];
};

export type ConnectionPreview = {
  sourceItemIds: string[];
  mode: ConnectionMode;
  candidates: ConnectionCandidate[];
  modelName: "local-stub";
  promptVersion: "connection-v1";
};

const MAX_SNIPPET_LENGTH = 120;

function compact(value: string, limit = MAX_SNIPPET_LENGTH): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function keywordFrom(source: ConnectionSource): string {
  const topic = source.topicGuess?.trim();
  if (topic) return topic;
  return (
    source.title
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/gi, ""))
      .find((word) => word.length > 3) ?? "saved thought"
  );
}

function titleList(sources: ConnectionSource[]): string {
  if (sources.length === 2) return `"${sources[0]?.title}" and "${sources[1]?.title}"`;
  const initial = sources.slice(0, -1).map((source) => `"${source.title}"`).join(", ");
  return `${initial}, and "${sources[sources.length - 1]?.title}"`;
}

function buildTitle(mode: ConnectionMode, sources: ConnectionSource[]): string {
  const primary = keywordFrom(sources[0] ?? { id: "missing-primary", title: "saved thought", rawContent: "A saved thought" });
  const secondary = keywordFrom(sources[1] ?? { id: "missing-secondary", title: "related thought", rawContent: "A related thought" });
  if (mode === "pattern") return `A shared ${primary.toLowerCase()} pattern`;
  if (mode === "idea") return `${primary} × ${secondary} idea`;
  if (mode === "plan") return `Small plan from ${primary.toLowerCase()}`;
  return `A better question about ${primary.toLowerCase()}`;
}

function buildSummary(mode: ConnectionMode, sources: ConnectionSource[]): string {
  const titles = titleList(sources);
  if (mode === "pattern") return `These cards may point to a recurring thread across ${titles}.`;
  if (mode === "idea") {
    return `One possible angle is to combine the context in ${titles} into a new direction worth keeping nearby.`;
  }
  if (mode === "plan") return `This could become a lightweight next step grounded in ${titles}, without forcing every card into a task.`;
  return `A useful next question may be what ${titles} reveal together that none of them explains alone.`;
}

function buildWhy(sources: ConnectionSource[]): string[] {
  return sources.slice(0, 5).map((source) => `${source.title}: ${compact(source.rawContent, 96)}`);
}

function buildActions(mode: ConnectionMode): string[] {
  if (mode === "plan") {
    return ["Pick one minimum viable next action.", "Save this connection before turning it into a task."];
  }
  if (mode === "question") {
    return ["Save the question if it opens useful thinking.", "Add one more card if the connection feels loose."];
  }
  return [
    "Save this connection if it feels worth revisiting.",
    "Add one more related card to sharpen the angle.",
    "Plan this only if there is an obvious small next action."
  ];
}

function confidenceFor(sources: ConnectionSource[]): number {
  const topicCount = new Set(sources.map((source) => source.topicGuess?.trim()).filter(Boolean)).size;
  const base = 0.5 + Math.min(0.2, sources.length * 0.04);
  const topicBoost = topicCount === 1 ? 0.12 : 0.04;
  return Math.max(0.35, Math.min(0.86, Number((base + topicBoost).toFixed(2))));
}

export function buildConnectionFallback(sources: ConnectionSource[], mode: ConnectionMode): ConnectionPreview {
  if (sources.length < 2 || sources.length > 5) {
    throw new Error("Connection fallback requires 2 to 5 sources.");
  }

  const primary: ConnectionCandidate = {
    title: buildTitle(mode, sources),
    summary: buildSummary(mode, sources),
    whyTheseConnect: buildWhy(sources),
    suggestedNextActions: buildActions(mode),
    confidence: confidenceFor(sources),
    sourceItemIds: sources.map((source) => source.id)
  };

  const secondary: ConnectionCandidate = {
    title: `One possible thread: ${keywordFrom(sources[0] as ConnectionSource)}`,
    summary: `Yurbrain noticed that ${titleList(sources)} may be useful together, even if the connection is still forming.`,
    whyTheseConnect: buildWhy([...sources].reverse()),
    suggestedNextActions: [
      "Save as a loose connection if this is worth remembering.",
      "Try another mode if you want a sharper interpretation."
    ],
    confidence: Math.max(0.4, Number((primary.confidence - 0.12).toFixed(2))),
    sourceItemIds: sources.map((source) => source.id)
  };

  return {
    sourceItemIds: sources.map((source) => source.id),
    mode,
    candidates: [primary, secondary],
    modelName: "local-stub",
    promptVersion: "connection-v1"
  };
}

export function validateConnectionPreview(preview: ConnectionPreview): ConnectionPreview {
  if (preview.candidates.length < 1 || preview.candidates.length > 3) {
    throw new Error("Connection preview must include 1 to 3 candidates.");
  }
  const sourceIds = new Set(preview.sourceItemIds);
  if (sourceIds.size < 2 || sourceIds.size > 5) {
    throw new Error("Connection preview must include 2 to 5 unique sources.");
  }
  for (const candidate of preview.candidates) {
    if (!candidate.title.trim() || !candidate.summary.trim()) {
      throw new Error("Connection candidates require a title and summary.");
    }
    if (candidate.whyTheseConnect.length === 0 || candidate.suggestedNextActions.length === 0) {
      throw new Error("Connection candidates require why and next-action grounding.");
    }
    if (candidate.confidence < 0 || candidate.confidence > 1) {
      throw new Error("Connection candidate confidence must be between 0 and 1.");
    }
    const groundingText = [candidate.summary, ...candidate.whyTheseConnect].join(" ").toLowerCase();
    const hasGroundedSource = preview.sourceItemIds.some((sourceId) => groundingText.includes(sourceId.slice(0, 8).toLowerCase()));
    const hasSemanticGrounding = candidate.whyTheseConnect.every((reason) => reason.includes(":"));
    if (!hasGroundedSource && !hasSemanticGrounding) {
      throw new Error("Connection candidates must reference source-specific details.");
    }
  }
  return preview;
}
