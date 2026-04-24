import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createServer } from "../../server";

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
}

test("brain-items search supports keyword fields, filters, empty query, no results, and user isolation", async () => {
  const dbPath = createDbPath("brain-items-search");
  await rm(dbPath, { recursive: true, force: true });
  const server = createServer({ databasePath: dbPath });
  const ownerId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const otherUserId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const ownerHeaders = { "x-yurbrain-user-id": ownerId };
  const otherHeaders = { "x-yurbrain-user-id": otherUserId };

  try {
    const base = Date.now();
    const oldCreatedAt = new Date(base - 2 * 24 * 60 * 60 * 1000).toISOString();
    const recentCreatedAt = new Date(base - 30 * 60 * 1000).toISOString();

    const ownerLinkItemId = randomUUID();
    const ownerIdeaItemId = randomUUID();
    const ownerQuoteItemId = randomUUID();
    const otherItemId = randomUUID();

    await server.state.repo.createBrainItem({
      id: ownerLinkItemId,
      userId: ownerId,
      type: "link",
      contentType: "link",
      title: "Nhost auth rollout notes",
      rawContent: "Migrate token checks and protect JWT validation",
      sourceLink: "https://docs.nhost.io/guides/auth-rollout",
      topicGuess: "auth",
      status: "active",
      createdAt: oldCreatedAt,
      updatedAt: oldCreatedAt
    });

    await server.state.repo.createBrainItem({
      id: ownerIdeaItemId,
      userId: ownerId,
      type: "idea",
      contentType: "text",
      title: "Founder review follow-up",
      rawContent: "Need tighter feed card continuity",
      topicGuess: "productivity",
      status: "archived",
      createdAt: recentCreatedAt,
      updatedAt: recentCreatedAt
    });

    await server.state.repo.createBrainItem({
      id: ownerQuoteItemId,
      userId: ownerId,
      type: "quote",
      contentType: "text",
      title: "Execution mantra",
      rawContent: "Move with clarity and remove friction",
      topicGuess: "mindset",
      status: "active",
      createdAt: recentCreatedAt,
      updatedAt: recentCreatedAt
    });

    await server.state.repo.createBrainItem({
      id: otherItemId,
      userId: otherUserId,
      type: "note",
      contentType: "text",
      title: "Private competitor intelligence",
      rawContent: "This should never appear in owner search",
      topicGuess: "secret",
      status: "active",
      createdAt: recentCreatedAt,
      updatedAt: recentCreatedAt
    });

    await server.state.repo.createArtifact({
      id: randomUUID(),
      itemId: ownerLinkItemId,
      userId: ownerId,
      type: "summary",
      payload: { content: "Post-alpha semantic search readiness" },
      confidence: 0.92,
      createdAt: recentCreatedAt
    });

    await server.state.repo.createArtifact({
      id: randomUUID(),
      itemId: ownerLinkItemId,
      userId: ownerId,
      type: "classification",
      payload: { content: "tag:auth-security", rationale: "Contains JWT migration steps" },
      confidence: 0.88,
      createdAt: recentCreatedAt
    });

    await server.state.repo.createArtifact({
      id: randomUUID(),
      itemId: otherItemId,
      userId: otherUserId,
      type: "classification",
      payload: { content: "tag:competitor-secret" },
      confidence: 0.8,
      createdAt: recentCreatedAt
    });

    const emptyQueryResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=",
      headers: ownerHeaders
    });
    assert.equal(emptyQueryResponse.statusCode, 200);
    const emptyQueryItems = emptyQueryResponse.json<Array<{ id: string }>>();
    assert.equal(emptyQueryItems.length, 3);

    const keywordTitleResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=rollout",
      headers: ownerHeaders
    });
    assert.equal(keywordTitleResponse.statusCode, 200);
    assert.deepEqual(keywordTitleResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const keywordRawContentResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=continuity",
      headers: ownerHeaders
    });
    assert.equal(keywordRawContentResponse.statusCode, 200);
    assert.deepEqual(keywordRawContentResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerIdeaItemId]);

    const keywordSourceUrlResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=docs.nhost.io",
      headers: ownerHeaders
    });
    assert.equal(keywordSourceUrlResponse.statusCode, 200);
    assert.deepEqual(keywordSourceUrlResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const keywordProcessedContentResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=semantic%20search%20readiness",
      headers: ownerHeaders
    });
    assert.equal(keywordProcessedContentResponse.statusCode, 200);
    assert.deepEqual(keywordProcessedContentResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const tagFilterResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?tag=auth-security",
      headers: ownerHeaders
    });
    assert.equal(tagFilterResponse.statusCode, 200);
    assert.deepEqual(tagFilterResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const typeFilterResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?type=idea",
      headers: ownerHeaders
    });
    assert.equal(typeFilterResponse.statusCode, 200);
    assert.deepEqual(typeFilterResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerIdeaItemId]);

    const statusFilterResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?status=archived",
      headers: ownerHeaders
    });
    assert.equal(statusFilterResponse.statusCode, 200);
    assert.deepEqual(statusFilterResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerIdeaItemId]);

    const createdFromResponse = await server.app.inject({
      method: "GET",
      url: `/brain-items?createdFrom=${encodeURIComponent(new Date(base - 2 * 60 * 60 * 1000).toISOString())}`,
      headers: ownerHeaders
    });
    assert.equal(createdFromResponse.statusCode, 200);
    const createdFromIds = createdFromResponse.json<Array<{ id: string }>>().map((item) => item.id).sort();
    assert.deepEqual(createdFromIds, [ownerIdeaItemId, ownerQuoteItemId].sort());

    const createdToResponse = await server.app.inject({
      method: "GET",
      url: `/brain-items?createdTo=${encodeURIComponent(new Date(base - 24 * 60 * 60 * 1000).toISOString())}`,
      headers: ownerHeaders
    });
    assert.equal(createdToResponse.statusCode, 200);
    assert.deepEqual(createdToResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const processedFilterResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?processingStatus=processed",
      headers: ownerHeaders
    });
    assert.equal(processedFilterResponse.statusCode, 200);
    assert.deepEqual(processedFilterResponse.json<Array<{ id: string }>>().map((item) => item.id), [ownerLinkItemId]);

    const pendingFilterResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?processingStatus=pending",
      headers: ownerHeaders
    });
    assert.equal(pendingFilterResponse.statusCode, 200);
    const pendingIds = pendingFilterResponse.json<Array<{ id: string }>>().map((item) => item.id).sort();
    assert.deepEqual(pendingIds, [ownerIdeaItemId, ownerQuoteItemId].sort());

    const noResultsResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=totally-absent-token",
      headers: ownerHeaders
    });
    assert.equal(noResultsResponse.statusCode, 200);
    assert.equal(noResultsResponse.json<unknown[]>().length, 0);

    const isolationResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=competitor",
      headers: ownerHeaders
    });
    assert.equal(isolationResponse.statusCode, 200);
    assert.equal(isolationResponse.json<unknown[]>().length, 0);

    const otherUserSeesOwnItemResponse = await server.app.inject({
      method: "GET",
      url: "/brain-items?q=competitor",
      headers: otherHeaders
    });
    assert.equal(otherUserSeesOwnItemResponse.statusCode, 200);
    assert.deepEqual(
      otherUserSeesOwnItemResponse.json<Array<{ id: string }>>().map((item) => item.id),
      [otherItemId]
    );
  } finally {
    await server.app.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
