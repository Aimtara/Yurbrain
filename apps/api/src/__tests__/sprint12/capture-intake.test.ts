import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("POST /capture/intake accepts minimal link payload and persists metadata", async () => {
  const userId = "88888888-8888-4888-8888-888888888888";
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    payload: {
      userId,
      link: "https://example.com/docs/intake-foundation",
      source: {
        app: "Slack",
        link: "https://example.com/thread/123"
      },
      preview: {
        description: "Capture context preview"
      },
      founderMode: true,
      execution: {
        taskId: "99999999-9999-4999-8999-999999999999",
        state: "in_progress"
      }
    }
  });

  assert.equal(response.statusCode, 201);
  const body = response.json<{
    item: {
      id: string;
      contentType: string;
      sourceApp: string | null;
      sourceLink: string | null;
      previewTitle: string | null;
      previewDescription: string | null;
      founderModeAtCapture: boolean;
      executionMetadata: Record<string, unknown> | null;
    };
    enrichment: { fallbackUsed: boolean };
  }>();
  assert.equal(body.item.contentType, "link");
  assert.equal(body.item.sourceApp, "Slack");
  assert.equal(body.item.sourceLink, "https://example.com/thread/123");
  assert.equal(body.item.previewDescription, "Capture context preview");
  assert.equal(body.item.founderModeAtCapture, true);
  assert.equal((body.item.executionMetadata ?? {}).state, "in_progress");
  assert.equal(body.enrichment.fallbackUsed, false);

  const fetched = await app.inject({
    method: "GET",
    url: `/brain-items/${body.item.id}`
  });
  assert.equal(fetched.statusCode, 200);
  const fetchedItem = fetched.json<{ sourceApp: string | null; contentType: string; founderModeAtCapture: boolean }>();
  assert.equal(fetchedItem.sourceApp, "Slack");
  assert.equal(fetchedItem.contentType, "link");
  assert.equal(fetchedItem.founderModeAtCapture, true);
});

test("POST /capture/intake accepts simplified deferred-capture payload", async () => {
  const userId = "8b8b8b8b-8b8b-48b8-8b8b-8b8b8b8b8b8b";
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
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
  assert.equal(body.item.executionMetadata?.captureContext?.recencyWeight, 1);
});

test("capture enrichment failures do not block persistence", async () => {
  const userId = "89898989-8989-4898-8989-898989898989";
  const response = await app.inject({
    method: "POST",
    url: "/capture/intake",
    payload: {
      userId,
      link: "http://[broken-url"
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

  const fetched = await app.inject({ method: "GET", url: `/brain-items/${body.item.id}` });
  assert.equal(fetched.statusCode, 200);
});

test("capture intake creates relation artifacts and a cluster feed card at threshold", async () => {
  const userId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const payloads = [
    {
      userId,
      text: "API migration checklist for incident readiness",
      topicGuess: "Engineering"
    },
    {
      userId,
      text: "Backend incident runbook updates for migration rollout",
      topicGuess: "Engineering"
    },
    {
      userId,
      text: "Production API bug triage and migration notes",
      topicGuess: "Engineering"
    }
  ];

  const first = await app.inject({ method: "POST", url: "/capture/intake", payload: payloads[0] });
  assert.equal(first.statusCode, 201);
  const second = await app.inject({ method: "POST", url: "/capture/intake", payload: payloads[1] });
  assert.equal(second.statusCode, 201);
  const third = await app.inject({ method: "POST", url: "/capture/intake", payload: payloads[2] });
  assert.equal(third.statusCode, 201);

  const thirdBody = third.json<{
    item: { id: string };
    relatedItems: Array<{ id: string; score: number }>;
    clusterCard: { cardType: string; title: string } | null;
  }>();
  assert.ok(thirdBody.relatedItems.length >= 2);
  assert.ok(thirdBody.relatedItems.every((entry) => entry.score >= 2));
  assert.ok(thirdBody.clusterCard);
  assert.equal(thirdBody.clusterCard?.cardType, "cluster");
  assert.ok(thirdBody.clusterCard?.title.includes("Engineering"));

  const feed = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&includeSnoozed=true`
  });
  assert.equal(feed.statusCode, 200);
  const feedCards = feed.json<Array<{ cardType: string; title: string }>>();
  assert.ok(feedCards.some((card) => card.cardType === "cluster" && card.title.includes("Engineering")));

  const artifacts = await app.inject({
    method: "GET",
    url: `/brain-items/${thirdBody.item.id}/artifacts?type=relation`
  });
  assert.equal(artifacts.statusCode, 200);
  const relationArtifacts = artifacts.json<Array<{ type: string; payload: { relatedItems?: unknown[] } }>>();
  assert.ok(relationArtifacts.length >= 1);
  assert.equal(relationArtifacts[0]?.type, "relation");
  assert.ok((relationArtifacts[0]?.payload.relatedItems?.length ?? 0) >= 1);
});
