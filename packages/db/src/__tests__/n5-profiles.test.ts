import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { createDbRepository } from "../index";

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

test("n5 profile helpers backfill missing user profiles from preferences", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `n5-profiles-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const repo = createDbRepository({ databasePath: dbPath });
  const userId = "11111111-1111-1111-1111-111111111111";

  try {
    await repo.upsertUserPreference(userId, { founderMode: true });
    const pending = await repo.listUserProfilesNeedingBackfill();
    assert.ok(pending.includes(userId));

    const backfilled = await repo.markUserProfileBackfilled(userId, "test_backfill");
    assert.equal(backfilled.id, userId);
    assert.equal(backfilled.backfillSource, "test_backfill");
    assert.ok(backfilled.backfilledAt);

    const profile = await repo.getUserProfileById(userId);
    assert.ok(profile);
    assert.equal(profile?.id, userId);
    assert.equal(profile?.backfillSource, "test_backfill");
  } finally {
    await repo.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("n5 profile helpers preserve explicit profile updates", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `n5-profiles-upsert-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const repo = createDbRepository({ databasePath: dbPath });
  const userId = "22222222-2222-2222-2222-222222222222";

  try {
    const initial = await repo.upsertUserProfile(userId, {
      displayName: "Yurbrain Founder",
      avatarUrl: "https://example.test/avatar.png",
      backfillSource: "manual",
      backfilled: true
    });
    assert.equal(initial.displayName, "Yurbrain Founder");
    assert.equal(initial.avatarUrl, "https://example.test/avatar.png");
    assert.equal(initial.backfillSource, "manual");
    assert.ok(initial.backfilledAt);

    const updated = await repo.upsertUserProfile(userId, {
      displayName: "Yurbrain Product Lead",
      backfillSource: "script",
      backfilled: true
    });
    assert.equal(updated.displayName, "Yurbrain Product Lead");
    assert.equal(updated.backfillSource, "script");
    assert.ok(updated.backfilledAt);

    const fetched = await repo.getUserProfileById(userId);
    assert.equal(fetched?.displayName, "Yurbrain Product Lead");
    assert.equal(fetched?.avatarUrl, "https://example.test/avatar.png");
  } finally {
    await repo.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("n5 profile backfill discovery includes all declared owner sources", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `n5-profiles-owner-sources-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const repo = createDbRepository({ databasePath: dbPath });
  const userFromTasks = "33333333-3333-3333-3333-333333333333";

  try {
    await repo.createTask({
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      userId: userFromTasks,
      sourceItemId: null,
      sourceMessageId: null,
      title: "Owner-source candidate from tasks only",
      status: "todo",
      createdAt: isoMinutesAgo(20),
      updatedAt: isoMinutesAgo(20)
    });

    const pending = await repo.listUserProfilesNeedingBackfill();
    assert.ok(pending.includes(userFromTasks));

    await repo.markUserProfileBackfilled(userFromTasks, "test_owner_source_backfill");
    const pendingAfter = await repo.listUserProfilesNeedingBackfill();
    assert.ok(!pendingAfter.includes(userFromTasks));
  } finally {
    await repo.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});

test("n5 repository writes propagate user ownership to scaffolded columns", async () => {
  const dbPath = path.resolve(process.cwd(), ".yurbrain-data", `n5-owner-write-paths-${process.pid}-${Date.now()}`);
  await rm(dbPath, { recursive: true, force: true });
  const repo = createDbRepository({ databasePath: dbPath });
  const userId = "44444444-4444-4444-8444-444444444444";
  const itemId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
  const threadId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const taskId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
  const sessionId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
  const artifactId = "ffffffff-ffff-4fff-8fff-ffffffffffff";
  const messageId = "99999999-9999-4999-8999-999999999999";

  try {
    await repo.createBrainItem({
      id: itemId,
      userId,
      type: "note",
      title: "Ownership propagation source item",
      rawContent: "Used to validate user ownership propagation.",
      status: "active",
      createdAt: isoMinutesAgo(40),
      updatedAt: isoMinutesAgo(40)
    });

    const createdThread = await repo.createThread({
      id: threadId,
      targetItemId: itemId,
      kind: "item_comment",
      createdAt: isoMinutesAgo(35),
      updatedAt: isoMinutesAgo(35)
    });
    assert.equal((createdThread as unknown as { userId?: string }).userId, userId);

    const createdMessage = await repo.createMessage({
      id: messageId,
      threadId,
      role: "user",
      content: "Ownership should follow the thread owner.",
      createdAt: isoMinutesAgo(34)
    });
    assert.equal((createdMessage as unknown as { userId?: string }).userId, userId);

    await repo.createTask({
      id: taskId,
      userId,
      sourceItemId: itemId,
      sourceMessageId: messageId,
      title: "Validate ownership propagation",
      status: "in_progress",
      createdAt: isoMinutesAgo(30),
      updatedAt: isoMinutesAgo(30)
    });

    const createdSession = await repo.createSession({
      id: sessionId,
      taskId,
      state: "running",
      startedAt: isoMinutesAgo(25),
      endedAt: null
    });
    assert.equal((createdSession as unknown as { userId?: string }).userId, userId);

    const createdArtifact = await repo.createArtifact({
      id: artifactId,
      itemId,
      type: "summary",
      payload: { content: "Ownership should follow the item owner." },
      confidence: 0.9,
      createdAt: isoMinutesAgo(20)
    });
    assert.equal((createdArtifact as unknown as { userId?: string }).userId, userId);
  } finally {
    await repo.close();
    await rm(dbPath, { recursive: true, force: true });
  }
});
