import assert from "node:assert/strict";
import { cp, rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { PGlite } from "@electric-sql/pglite";

import { resetDatabase } from "../index";

test("local backup restore drill preserves core loop records", async () => {
  const basePath = path.resolve(
    process.cwd(),
    ".yurbrain-data",
    `backup-restore-drill-${process.pid}-${Date.now()}`
  );
  const dbPath = path.join(basePath, "runtime");
  const backupPath = path.join(basePath, "backup-copy");
  const userId = "12121212-1212-4121-8121-121212121212";
  const itemId = "34343434-3434-4343-8343-343434343434";
  const taskId = "56565656-5656-4565-8565-565656565656";

  await rm(basePath, { recursive: true, force: true });

  try {
    await resetDatabase({ databasePath: dbPath });
    const client = new PGlite({ dataDir: dbPath });
    try {
      await client.query("INSERT INTO profiles (id, display_name) VALUES ($1, 'Restore Drill User')", [userId]);
      await client.query(
        `
        INSERT INTO brain_items (id, user_id, type, title, raw_content, status)
        VALUES ($1, $2, 'note', 'Restore drill memory', 'Continuity record for backup restore drill', 'active')
        `,
        [itemId, userId]
      );
      await client.query(
        `
        INSERT INTO tasks (id, user_id, source_item_id, title, status)
        VALUES ($1, $2, $3, 'Restore drill task', 'todo')
        `,
        [taskId, userId, itemId]
      );
      await client.query(
        `
        INSERT INTO user_preferences (user_id, default_lens, clean_focus_mode, founder_mode)
        VALUES ($1, 'all', true, false)
        `,
        [userId]
      );
    } finally {
      await client.close();
    }

    await cp(dbPath, backupPath, { recursive: true });
    await rm(dbPath, { recursive: true, force: true });
    await cp(backupPath, dbPath, { recursive: true });

    const restoredClient = new PGlite({ dataDir: dbPath });
    try {
      const itemResult = await restoredClient.query<{ title: string }>(
        "SELECT title FROM brain_items WHERE id = $1 AND user_id = $2",
        [itemId, userId]
      );
      const taskResult = await restoredClient.query<{ title: string }>(
        "SELECT title FROM tasks WHERE id = $1 AND user_id = $2 AND source_item_id = $3",
        [taskId, userId, itemId]
      );
      const preferenceResult = await restoredClient.query<{ default_lens: string }>(
        "SELECT default_lens FROM user_preferences WHERE user_id = $1",
        [userId]
      );

      assert.equal(itemResult.rows[0]?.title, "Restore drill memory");
      assert.equal(taskResult.rows[0]?.title, "Restore drill task");
      assert.equal(preferenceResult.rows[0]?.default_lens, "all");
    } finally {
      await restoredClient.close();
    }
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});
