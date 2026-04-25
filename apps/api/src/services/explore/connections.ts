import { randomUUID } from "node:crypto";
import type {
  ConnectionMode,
  ExploreConnectionCandidate,
  ExploreConnectionPreviewResponse,
  ExploreConnectionSaveResponse
} from "@yurbrain/contracts";
import { ConnectionArtifactContentSchema, FeedCardSchema } from "@yurbrain/contracts";
import type { AppState, BrainItemRecord } from "../../state";
import type { FeedWhyShown, StoredFeedCard } from "../feed/static-feed";
import { toFeedCardResponse } from "../feed/static-feed";

export type ExploreConnectionInput = {
  userId: string;
  sourceItemIds: string[];
  mode: ConnectionMode;
};

export type SaveExploreConnectionInput = ExploreConnectionInput & {
  candidate: ExploreConnectionCandidate;
};

function compact(value: string, limit: number): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function keywordFrom(item: BrainItemRecord): string {
  const topic = item.topicGuess?.trim();
  if (topic) return topic;
  const firstTitleWord = item.title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .find((word) => word.length > 3);
  return firstTitleWord ?? "saved thought";
}

function titleList(items: BrainItemRecord[]): string {
  if (items.length === 0) return "these cards";
  if (items.length === 1) return items[0]?.title ?? "this card";
  if (items.length === 2) return `"${items[0]?.title}" and "${items[1]?.title}"`;
  const initial = items.slice(0, -1).map((item) => `"${item.title}"`).join(", ");
  return `${initial}, and "${items[items.length - 1]?.title}"`;
}

function buildModeTitle(mode: ConnectionMode, items: BrainItemRecord[]) {
  const primary = keywordFrom(items[0] as BrainItemRecord);
  const secondary = keywordFrom(items[1] as BrainItemRecord);
  if (mode === "pattern") return `A shared ${primary.toLowerCase()} pattern`;
  if (mode === "idea") return `${primary} × ${secondary} idea`;
  if (mode === "plan") return `Small plan from ${primary.toLowerCase()}`;
  return `A better question about ${primary.toLowerCase()}`;
}

function buildModeSummary(mode: ConnectionMode, items: BrainItemRecord[]) {
  const titles = titleList(items);
  if (mode === "pattern") {
    return `These cards may point to a recurring thread across ${titles}.`;
  }
  if (mode === "idea") {
    return `One possible angle is to combine the context in ${titles} into a new direction worth keeping nearby.`;
  }
  if (mode === "plan") {
    return `This could become a lightweight next step based on what ${titles} already preserve.`;
  }
  return `A useful next question may be what still feels unresolved across ${titles}.`;
}

function buildWhyTheseConnect(items: BrainItemRecord[]): string[] {
  return items.slice(0, 5).map((item) => {
    const topic = item.topicGuess ? ` around ${item.topicGuess}` : "";
    return `${item.title}${topic}: ${compact(item.rawContent, 96)}`;
  });
}

function buildSuggestedNextActions(mode: ConnectionMode, items: BrainItemRecord[]): string[] {
  if (mode === "plan") {
    return [
      "Choose the smallest next move that preserves momentum.",
      "Turn this connection into a task only if it feels ready.",
      "Leave one comment on the source item if more context is needed."
    ];
  }
  if (mode === "question") {
    return [
      "Ask Yurbrain one bounded follow-up about this connection.",
      "Add one missing source card if the connection feels loose.",
      "Save the question if you want it to resurface later."
    ];
  }
  return [
    "Save this connection if it feels worth revisiting.",
    "Add one more related card to sharpen the angle.",
    "Plan this only if there is an obvious small next action."
  ];
}

function confidenceFor(items: BrainItemRecord[]): number {
  const topicCount = new Set(items.map((item) => item.topicGuess).filter(Boolean)).size;
  const sharedTopicBoost = topicCount === 1 && items.some((item) => item.topicGuess) ? 0.12 : 0;
  return Math.min(0.86, 0.58 + items.length * 0.04 + sharedTopicBoost);
}

export async function loadOwnedSourceItems(state: AppState, userId: string, sourceItemIds: string[]) {
  const uniqueIds = Array.from(new Set(sourceItemIds));
  if (uniqueIds.length !== sourceItemIds.length) {
    return null;
  }
  const items = await Promise.all(uniqueIds.map((itemId) => state.repo.getBrainItemById(itemId)));
  if (items.some((item) => !item || item.userId !== userId)) {
    return null;
  }
  return items as BrainItemRecord[];
}

export function buildConnectionCandidates(items: BrainItemRecord[], mode: ConnectionMode): ExploreConnectionCandidate[] {
  const primary: ExploreConnectionCandidate = {
    title: buildModeTitle(mode, items),
    summary: buildModeSummary(mode, items),
    whyTheseConnect: buildWhyTheseConnect(items),
    suggestedNextActions: buildSuggestedNextActions(mode, items),
    confidence: confidenceFor(items)
  };

  const second: ExploreConnectionCandidate = {
    title: `One possible thread: ${keywordFrom(items[0] as BrainItemRecord)}`,
    summary: `Yurbrain noticed that ${titleList(items)} may be useful together, even if the connection is still forming.`,
    whyTheseConnect: buildWhyTheseConnect([...items].reverse()),
    suggestedNextActions: [
      "Save as a loose connection if this is worth remembering.",
      "Try another mode if you want a sharper interpretation."
    ],
    confidence: Math.max(0.4, confidenceFor(items) - 0.12)
  };

  return [primary, second];
}

export function previewExploreConnection(items: BrainItemRecord[], mode: ConnectionMode): ExploreConnectionPreviewResponse {
  return {
    sourceItemIds: items.map((item) => item.id),
    mode,
    candidates: buildConnectionCandidates(items, mode)
  };
}

const connectionWhyShown = (sourceCount: number): FeedWhyShown => ({
  summary: `Saved connection from ${sourceCount} source cards.`,
  reasons: [
    `You chose to keep this connection from ${sourceCount} source cards.`,
    "Brought back as a normal Focus card so the thread can continue."
  ]
});

export async function saveExploreConnection(
  state: AppState,
  input: SaveExploreConnectionInput,
  items: BrainItemRecord[]
): Promise<ExploreConnectionSaveResponse> {
  const now = new Date().toISOString();
  const primaryItem = items[0] as BrainItemRecord;
  const content = ConnectionArtifactContentSchema.parse({
    ...input.candidate,
    sourceItemIds: items.map((item) => item.id),
    sourceArtifactIds: [],
    sourceCommentIds: [],
    connectionMode: input.mode,
    createdAt: now
  });

  const artifact = await state.repo.createArtifact({
    id: randomUUID(),
    itemId: primaryItem.id,
    userId: input.userId,
    type: "connection",
    payload: content,
    confidence: input.candidate.confidence,
    createdAt: now
  });

  const storedCard: StoredFeedCard = await state.repo.createFeedCard({
    id: randomUUID(),
    userId: input.userId,
    cardType: "connection",
    lens: "keep_in_mind",
    itemId: primaryItem.id,
    taskId: null,
    title: input.candidate.title,
    body: input.candidate.summary,
    dismissed: false,
    snoozedUntil: null,
    refreshCount: 0,
    postponeCount: 0,
    relatedCount: items.length,
    lastPostponedAt: null,
    lastRefreshedAt: null,
    lastTouched: now,
    createdAt: now
  });

  const feedCard = FeedCardSchema.parse(
    toFeedCardResponse(storedCard, connectionWhyShown(items.length), {
      relatedCount: items.length,
      clusterTopic: "Connection",
      clusterItemIds: items.map((item) => item.id),
      lastTouched: now
    })
  );

  return {
    artifact: {
      id: artifact.id,
      itemId: artifact.itemId,
      type: artifact.type,
      payload: artifact.payload,
      confidence: artifact.confidence,
      createdAt: artifact.createdAt
    },
    feedCard,
    connection: content
  };
}
