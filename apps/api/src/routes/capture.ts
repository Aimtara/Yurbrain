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
import { detectRelatedItems } from "../services/capture/related-items";
import { generateCardFromItem } from "../services/feed/generate-card";
import type { FeedWhyShown, StoredFeedCard } from "../services/feed/static-feed";
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

function toFeedCardContract(card: StoredFeedCard, whyShown: FeedWhyShown) {
  return FeedCardSchema.parse(toFeedCardResponse(card, whyShown));
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
      topicGuess: enriched.topicGuess,
      clusterKey: enriched.clusterKey,
      founderModeAtCapture,
      executionMetadata: payload.execution ?? null,
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

    const allItems = await state.repo.listBrainItemsByUser(item.userId);
    const relatedItems = detectRelatedItems(
      item,
      allItems.filter((candidate) => candidate.id !== item.id),
      { limit: 5 }
    );

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
        item,
        relatedItems,
        clusterCard: clusterCard ? toFeedCardContract(clusterCard, clusterWhyShown) : null,
        enrichment: {
          fallbackUsed: enriched.fallbackUsed,
          warnings: enriched.warnings
        }
      })
    );
  });
}
