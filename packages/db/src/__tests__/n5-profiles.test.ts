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
