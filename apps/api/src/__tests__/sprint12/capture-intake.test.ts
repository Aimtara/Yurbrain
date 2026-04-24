import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("POST /capture/intake accepts near-zero-friction payload and persists continuity metadata", async () => {
  const userId = "88888888-8888-4888-8888-888888888888";
  const headers = { "x-yurbrain-user-id": userId };
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      userId,
      type: "link",
      content: "https://example.com/docs/intake-foundation",
      source: "Slack",
      note: "Revisit this for launch planning",
      founderMode: true,
      execution: {
        taskId: "99999999-9999-4999-8999-999999999999",
        state: "in_progress"
      }
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    itemId: string;
    item: {
      id: string;
      contentType: string;
      sourceApp: string | null;
      sourceLink: string | null;
      note: string | null;
      recencyWeight: number;
      previewTitle: string | null;
      founderModeAtCapture: boolean;
      executionMetadata: Record<string, unknown> | null;
    };
    preview: { title: string; source: string | null; contentType: string };
    enrichment: { fallbackUsed: boolean };
  }>();
  assert.equal(body.itemId, body.item.id);
  assert.equal(body.item.contentType, "link");
  assert.equal(body.item.sourceApp, "Slack");
  assert.equal(body.item.sourceLink, "https://example.com/docs/intake-foundation");
  assert.equal(body.item.note, "Revisit this for launch planning");
  assert.equal(body.item.recencyWeight, 0.85);
  assert.equal(body.preview.contentType, "link");
  assert.equal(body.preview.source, "Slack");
  assert.ok(body.preview.title.length > 0);
  assert.equal(body.item.founderModeAtCapture, true);
  assert.equal((body.item.executionMetadata ?? {}).state, "in_progress");
  assert.equal(body.enrichment.fallbackUsed, false);

  const fetched = await app.inject({
    method: "GET",
    url: `/brain-items/${body.item.id}`,
    headers
  });
  assert.equal(fetched.statusCode, 200);
  const fetchedItem = fetched.json<{ sourceApp: string | null; contentType: string; founderModeAtCapture: boolean }>();
  assert.equal(fetchedItem.sourceApp, "Slack");
  assert.equal(fetchedItem.contentType, "link");
  assert.equal(fetchedItem.founderModeAtCapture, true);
});

test("POST /capture/intake accepts simplified deferred-capture payload", async () => {
  const userId = "8b8b8b8b-8b8b-48b8-8b8b-8b8b8b8b8b8b";
  const headers = { "x-yurbrain-user-id": userId };
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      userId,
      type: "link",
      content: "https://example.com/continuity-loop",
      source: "Browser share sheet",
      note: "Revisit for planning later"
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    itemId: string;
    preview: {
      title: string;
      snippet: string;
      contentType: string;
      source: string | null;
      note: string | null;
    };
    item: {
      id: string;
      executionMetadata: { captureContext?: { recencyWeight?: number; note?: string | null } } | null;
    };
  }>();
  assert.equal(body.itemId, body.item.id);
  assert.equal(body.preview.contentType, "link");
  assert.equal(body.preview.source, "Browser share sheet");
  assert.equal(body.preview.note, "Revisit for planning later");
  assert.ok(body.preview.title.length > 0);
  assert.ok(body.preview.snippet.length > 0);
  assert.equal(body.item.executionMetadata?.captureContext?.note, "Revisit for planning later");
  assert.equal(body.item.executionMetadata?.captureContext?.recencyWeight, 0.85);
});

test("capture enrichment failures do not block persistence", async () => {
  const userId = "89898989-8989-4898-8989-898989898989";
  const headers = { "x-yurbrain-user-id": userId };
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      userId,
      type: "link",
      content: "http://[broken-url"
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    item: { id: string; previewTitle: string | null };
    enrichment: { fallbackUsed: boolean; warnings: string[] };
  }>();
  assert.equal(body.enrichment.fallbackUsed, true);
  assert.ok(body.enrichment.warnings.includes("source_link_parse_failed"));
  assert.equal(body.item.previewTitle, "Saved link");

  const fetched = await app.inject({ method: "GET", url: `/brain-items/${body.item.id}`, headers });
  assert.equal(fetched.statusCode, 200);
});

test("capture intake stores image reference metadata without faking file upload", async () => {
  const userId = "89999999-8999-4899-8999-899999999999";
  const headers = { "x-yurbrain-user-id": userId };
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      userId,
      type: "image",
      content: "https://example.com/assets/product-screenshot.png",
      source: {
        app: "Mobile share sheet",
        link: "https://example.com/assets/product-screenshot.png"
      },
      note: "Screenshot to revisit after standup"
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    itemId: string;
    item: {
      id: string;
      type: string;
      contentType: string;
      sourceApp: string | null;
      sourceLink: string | null;
      previewImageUrl: string | null;
      note: string | null;
      rawContent: string;
    };
    preview: {
      contentType: string;
      source: string | null;
      note: string | null;
      snippet: string;
    };
  }>();

  assert.equal(body.itemId, body.item.id);
  assert.equal(body.item.type, "file");
  assert.equal(body.item.contentType, "image");
  assert.equal(body.item.sourceApp, "Mobile share sheet");
  assert.equal(body.item.sourceLink, "https://example.com/assets/product-screenshot.png");
  assert.equal(body.item.previewImageUrl, "https://example.com/assets/product-screenshot.png");
  assert.equal(body.item.note, "Screenshot to revisit after standup");
  assert.equal(body.item.rawContent, "https://example.com/assets/product-screenshot.png");
  assert.equal(body.preview.contentType, "image");
  assert.equal(body.preview.source, "Mobile share sheet");
  assert.equal(body.preview.note, "Screenshot to revisit after standup");
  assert.ok(body.preview.snippet.length > 0);
});

test("capture intake rejects empty payload with graceful validation error", async () => {
  const userId = "8a8a8a8a-8a8a-48a8-8a8a-8a8a8a8a8a8a";
  const headers = { "x-yurbrain-user-id": userId };
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    headers,
    payload: {
      userId,
      type: "text",
      source: "empty-capture-test"
    }
  });

  assert.equal(response.statusCode, 400);
  const body = response.json<{
    message?: string;
    issues?: Array<{ path: string; message: string }>;
    error?: { details?: Array<{ path: string; message: string }> };
  }>();
  const issueMessages = [
    ...(body.issues ?? []).map((issue) => issue.message),
    ...((body.error?.details ?? []).map((issue) => issue.message))
  ];
  assert.ok((body.message ?? "").includes("Validation failed"));
  assert.ok(
    issueMessages.some((message) =>
      message.includes("At least one of content, text, link, or image is required")
    )
  );
});

test("capture intake creates relation artifacts and a cluster feed card at threshold", async () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const headers = { "x-yurbrain-user-id": userId };
  const payloads = [
    {
      userId,
      type: "text",
      content: "API migration checklist for incident readiness",
      topicGuess: "Engineering"
    },
    {
      userId,
      type: "text",
      content: "Backend incident runbook updates for migration rollout",
      topicGuess: "Engineering"
    },
    {
      userId,
      type: "text",
      content: "Production API bug triage and migration notes",
      topicGuess: "Engineering"
    }
  ];

  const first = await app.inject({ method: "POST", url: "/capture/intake", headers, payload: payloads[0] });
  assert.equal(first.statusCode, 201);
  const second = await app.inject({ method: "POST", url: "/capture/intake", headers, payload: payloads[1] });
  assert.equal(second.statusCode, 201);
  const third = await app.inject({ method: "POST", url: "/capture/intake", headers, payload: payloads[2] });
  assert.equal(third.statusCode, 201);

  const thirdBody = third.json<{
    item: { id: string };
    relatedItems: Array<{ id: string; score: number }>;
    clusterCard: { cardType: string; title: string; relatedCount: number | null; lastTouched: string | null; whyShownText?: string } | null;
  }>();
  assert.ok(thirdBody.relatedItems.length >= 2);
  assert.ok(thirdBody.relatedItems.every((entry) => entry.score >= 2));
  assert.ok(thirdBody.clusterCard);
  assert.equal(thirdBody.clusterCard?.cardType, "cluster");
  assert.ok(thirdBody.clusterCard?.title.includes("Engineering"));
  assert.ok((thirdBody.clusterCard?.relatedCount ?? 0) >= 3);
  assert.ok(Boolean(thirdBody.clusterCard?.lastTouched));

  const feed = await app.inject({
    method: "GET",
    url: "/feed?includeSnoozed=true",
    headers
  });
  assert.equal(feed.statusCode, 200);
  const feedCards = feed.json<Array<{ cardType: string; title: string }>>();
  assert.ok(feedCards.some((card) => card.cardType === "cluster" && card.title.includes("Engineering")));

  const artifacts = await app.inject({
    method: "GET",
    url: `/brain-items/${thirdBody.item.id}/artifacts?type=relation`,
    headers
  });
  assert.equal(artifacts.statusCode, 200);
  const relationArtifacts = artifacts.json<Array<{ type: string; payload: { relatedItems?: unknown[] } }>>();
  assert.ok(relationArtifacts.length >= 1);
  assert.equal(relationArtifacts[0]?.type, "relation");
  assert.ok((relationArtifacts[0]?.payload.relatedItems?.length ?? 0) >= 1);
});
