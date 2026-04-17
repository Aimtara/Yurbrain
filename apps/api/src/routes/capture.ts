import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import {
  BrainItemResponseSchema,
  BrainItemStatusSchema,
  BrainItemTypeSchema,
  CaptureIntakeRequestSchema,
  CaptureIntakeResponseSchema,
  EventTypeSchema,
  FeedCardSchema
} from "../../../../packages/contracts/src";
import { enrichCapture } from "../services/capture/enrichment";
import { getRelatedItems } from "../services/capture/related-items";
import { generateCardFromItem } from "../services/feed/generate-card";
import type { FeedCardMeta, FeedWhyShown, StoredFeedCard } from "../services/feed/static-feed";
import { toFeedCardResponse } from "../services/feed/static-feed";
import type { AppState } from "../state";

const clusterThreshold = 3;

const clusterWhyShown: FeedWhyShown = {
  summary: "Multiple captures are converging on the same thread.",
  reasons: ["Multiple captures are converging on the same thread.", "Grouped so you can process related context in one pass."]
};

function mapContentTypeToBrainItemType(contentType: "text" | "link" | "image") {
  if (contentType === "link") {
    return BrainItemTypeSchema.parse("link");
  }
  if (contentType === "image") {
    return BrainItemTypeSchema.parse("file");
  }
  return BrainItemTypeSchema.parse("note");
}

function toFeedCardContract(card: StoredFeedCard, whyShown: FeedWhyShown, meta: FeedCardMeta = {}) {
  return FeedCardSchema.parse(toFeedCardResponse(card, whyShown, meta));
}

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(1, limit - 1)).trimEnd()}…`;
}

function normalizeOptionalText(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function resolveSourcePreview(value: string | { app?: string; link?: string } | undefined, fallback: string | null): string | null {
  if (!value) return fallback;
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
  }
  return value.app?.trim() || value.link?.trim() || fallback;
}

function buildExecutionMetadata(
  payload: { execution?: Record<string, unknown>; note?: string; source?: string | { app?: string; link?: string } },
  enriched: { contentType: "text" | "link" | "image"; topicGuess: string | null; recencyWeight: number }
) {
  const note = normalizeOptionalText(payload.note);
  const base = payload.execution ?? {};
  return {
    ...base,
    captureContext: {
      contentType: enriched.contentType,
      topicGuess: enriched.topicGuess,
      recencyWeight: enriched.recencyWeight,
      source: resolveSourcePreview(payload.source, null),
      note
    }
  };
}

export async function registerCaptureRoutes(app: FastifyInstance, state: AppState) {
  app.post("/capture/intake", async (request, reply) => {
    const payload = CaptureIntakeRequestSchema.parse(request.body);
    const now = new Date().toISOString();
    const enriched = enrichCapture(payload);
    const preference = payload.founderMode === undefined ? await state.repo.getUserPreference(payload.userId) : null;
    const founderModeAtCapture = payload.founderMode ?? preference?.founderMode ?? false;

    const item = BrainItemResponseSchema.parse({
      id: randomUUID(),
      userId: payload.userId,
      type: mapContentTypeToBrainItemType(enriched.contentType),
      contentType: enriched.contentType,
      title: enriched.title,
      rawContent: enriched.rawContent,
      sourceApp: enriched.sourceApp,
      sourceLink: enriched.sourceLink,
      previewTitle: enriched.previewTitle,
      previewDescription: enriched.previewDescription,
      previewImageUrl: enriched.previewImageUrl,
      note: normalizeOptionalText(payload.note),
      topicGuess: enriched.topicGuess,
      recencyWeight: enriched.recencyWeight,
      clusterKey: enriched.clusterKey,
      founderModeAtCapture,
      executionMetadata: buildExecutionMetadata(payload, enriched),
      status: BrainItemStatusSchema.parse("active"),
      createdAt: now,
      updatedAt: now
    });

    await state.repo.createBrainItem(item);
    const existingCards = await state.repo.listFeedCardsByUser(item.userId);
    const hasItemCard = existingCards.some((card) => card.itemId === item.id);
    if (!hasItemCard) {
      await state.repo.createFeedCard(
        generateCardFromItem({
          id: item.id,
          userId: item.userId,
          title: item.title,
          rawContent: item.rawContent,
          createdAt: item.createdAt
        })
      );
    }

    const relatedItems = await getRelatedItems(state.repo, item.id, { limit: 5 });

    if (relatedItems.length > 0) {
      const topScore = relatedItems[0]?.score ?? 0;
      await state.repo.createArtifact({
        id: randomUUID(),
        itemId: item.id,
        type: "relation",
        payload: {
          topicGuess: item.topicGuess,
          clusterKey: item.clusterKey,
          relatedItems
        },
        confidence: Math.max(0.2, Math.min(0.95, topScore / 8)),
        createdAt: now
      });
    }

    let clusterCard: StoredFeedCard | null = null;
    const clusterItemIds = [item.id, ...relatedItems.map((entry) => entry.id)];
    if ((relatedItems.length + 1 >= clusterThreshold) && item.clusterKey) {
      const clusterTopic = item.topicGuess ?? "Related captures";
      const clusterTitle = `Cluster: ${clusterTopic}`;
      const clusterBody = `${relatedItems.length + 1} captures align around ${clusterTopic}.`;
      const hasMatchingCluster = existingCards.some((card) => card.cardType === "cluster" && card.title === clusterTitle);
      if (!hasMatchingCluster) {
        clusterCard = await state.repo.createFeedCard({
          id: randomUUID(),
          userId: item.userId,
          cardType: "cluster",
          lens: "keep_in_mind",
          itemId: item.id,
          taskId: null,
          title: clusterTitle,
          body: clusterBody,
          dismissed: false,
          snoozedUntil: null,
          refreshCount: 0,
          postponeCount: 0,
          lastPostponedAt: null,
          lastRefreshedAt: null,
          createdAt: now
        });
      }
    }

    await state.repo.appendEvent({
      id: randomUUID(),
      userId: item.userId,
      eventType: EventTypeSchema.parse("brain_item_created"),
      payload: {
        id: item.id,
        type: item.type,
        contentType: item.contentType,
        topicGuess: item.topicGuess
      },
      occurredAt: now
    });

    return reply.code(201).send(
      CaptureIntakeResponseSchema.parse({
        itemId: item.id,
        preview: {
          title: item.previewTitle ?? item.title,
          snippet: truncate(item.rawContent, 180),
          contentType: item.contentType,
          topicGuess: item.topicGuess,
          source: resolveSourcePreview(payload.source, item.sourceApp ?? item.sourceLink),
          note: normalizeOptionalText(payload.note)
        },
        item,
        relatedItems,
        clusterCard: clusterCard
          ? toFeedCardContract(clusterCard, clusterWhyShown, {
              relatedCount: clusterItemIds.length,
              clusterTopic: item.topicGuess,
              clusterItemIds,
              lastTouched: now
            })
          : null,
        enrichment: {
          fallbackUsed: enriched.fallbackUsed,
          warnings: enriched.warnings
        }
      })
    );
  });
}
