import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { createServer } from "../../server";
import { createTestJwt } from "../helpers/auth-token";

process.env.NODE_ENV = "test";
process.env.YURBRAIN_TEST_MODE = "1";

async function strictHeaders(userId: string) {
  return {
    authorization: `Bearer ${await createTestJwt(userId)}`,
    "x-yurbrain-auth-mode": "strict"
  };
}

test("explore preview is non-persistent and save returns connection to Focus", async () => {
  const { app } = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `explore-connections-${process.pid}-a`)
  });
  test.after(async () => {
    await app.close();
  });

  const userId = "16161616-1616-4616-8616-161616161616";
  const headers = await strictHeaders(userId);

  async function createItem(title: string, rawContent: string) {
    const response = await app.inject({
      method: "POST",
      url: "/brain-items",
      headers,
      payload: { type: "note", title, rawContent }
    });
    assert.equal(response.statusCode, 201);
    return response.json<{ id: string }>();
  }

  const first = await createItem("Desk ritual idea", "Maya wants her desk to feel calmer with a small daily ritual.");
  const second = await createItem("Minimal lamp reference", "Saved a warm minimalist desk lamp that feels calming and personal.");

  const preview = await app.inject({
    method: "POST",
    url: "/explore/connections/preview",
    headers,
    payload: {
      sourceItemIds: [first.id, second.id],
      mode: "idea"
    }
  });
  assert.equal(preview.statusCode, 200);
  const previewBody = preview.json<{
    candidates: Array<{
      title: string;
      summary: string;
      whyTheseConnect: string[];
      suggestedNextActions: string[];
      confidence: number;
    }>;
  }>();
  assert.ok(previewBody.candidates.length >= 1);
  assert.match(previewBody.candidates[0]?.summary ?? "", /Desk ritual idea|Minimal lamp reference|desk|lamp/i);

  const artifactsBeforeSave = await app.inject({
    method: "GET",
    url: `/brain-items/${first.id}/artifacts?type=connection`,
    headers
  });
  assert.equal(artifactsBeforeSave.statusCode, 200);
  assert.equal(artifactsBeforeSave.json<unknown[]>().length, 0);

  const candidate = previewBody.candidates[0];
  assert.ok(candidate);
  const save = await app.inject({
    method: "POST",
    url: "/explore/connections/save",
    headers,
    payload: {
      sourceItemIds: [first.id, second.id],
      mode: "idea",
      candidate
    }
  });
  assert.equal(save.statusCode, 201);
  const saved = save.json<{ artifact: { type: string; payload: { sourceItemIds: string[] } }; feedCard: { cardType: string; title: string } }>();
  assert.equal(saved.artifact.type, "connection");
  assert.deepEqual(saved.artifact.payload.sourceItemIds, [first.id, second.id]);
  assert.equal(saved.feedCard.cardType, "connection");

  const feed = await app.inject({ method: "GET", url: "/feed?lens=all&limit=10", headers });
  assert.equal(feed.statusCode, 200);
  const cards = feed.json<Array<{ cardType: string; title: string }>>();
  assert.ok(cards.some((card) => card.cardType === "connection" && card.title === saved.feedCard.title));
});

test("explore preview rejects cross-user source items", async () => {
  const { app } = createServer({
    databasePath: path.resolve(process.cwd(), ".yurbrain-data", `explore-connections-${process.pid}-b`)
  });
  test.after(async () => {
    await app.close();
  });

  const ownerHeaders = await strictHeaders("26262626-2626-4626-8626-262626262626");
  const otherHeaders = await strictHeaders("36363636-3636-4636-8636-363636363636");

  const owned = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: ownerHeaders,
    payload: { type: "note", title: "Private thought", rawContent: "Only owner should explore this." }
  });
  assert.equal(owned.statusCode, 201);
  const item = owned.json<{ id: string }>();

  const other = await app.inject({
    method: "POST",
    url: "/brain-items",
    headers: otherHeaders,
    payload: { type: "note", title: "Other user thought", rawContent: "Other user's source." }
  });
  assert.equal(other.statusCode, 201);
  const otherItem = other.json<{ id: string }>();

  const blocked = await app.inject({
    method: "POST",
    url: "/explore/connections/preview",
    headers: ownerHeaders,
    payload: {
      sourceItemIds: [item.id, otherItem.id],
      mode: "pattern"
    }
  });
  assert.equal(blocked.statusCode, 404);
});
