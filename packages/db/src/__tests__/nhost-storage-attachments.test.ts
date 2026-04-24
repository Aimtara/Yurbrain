import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { and, eq } from "drizzle-orm";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import { attachments } from "../schema";
import { resetDatabase } from "../index";

test("storage attachments migration creates usable attachments table", async () => {
  const dbPath = path.resolve(
    process.cwd(),
    ".yurbrain-data",
    `nhost-storage-attachments-${process.pid}-${Date.now()}`
  );
  await rm(dbPath, { recursive: true, force: true });

  const userId = "77777777-7777-4777-8777-777777777777";
  const itemId = "88888888-8888-4888-8888-888888888888";

  try {
    await resetDatabase({ databasePath: dbPath });
    const client = new PGlite({ dataDir: dbPath });
    const db = drizzle(client);

    try {
      await client.query(
        `
        INSERT INTO profiles (id, display_name)
        VALUES ($1, 'Storage Test User')
        `,
        [userId]
      );

      await client.query(
        `
        INSERT INTO brain_items (
          id, user_id, type, title, raw_content, status
        )
        VALUES (
          $1, $2, 'file', 'Attachment source item', 'Storage metadata linkage test item', 'active'
        )
        `,
        [itemId, userId]
      );

      await client.query(
        `
        INSERT INTO attachments (
          user_id, item_id, bucket, object_key, kind, mime_type, size_bytes, status
        ) VALUES (
          $1, $2, 'capture_assets', $3, 'file', 'text/plain', 128, 'uploaded'
        )
        `,
        [userId, itemId, `user/${userId}/captures/${itemId}/asset-1.txt`]
      );

      const rows = await db
        .select()
        .from(attachments)
        .where(
          and(
            eq(attachments.userId, userId),
            eq(attachments.itemId, itemId),
            eq(attachments.bucket, "capture_assets")
          )
        )
        .limit(1);

      const inserted = rows[0];
      assert.ok(inserted);
      assert.equal(inserted.userId, userId);
      assert.equal(inserted.itemId, itemId);
      assert.equal(inserted.bucket, "capture_assets");
      assert.equal(inserted.kind, "file");
      assert.equal(inserted.mimeType, "text/plain");
      assert.equal(inserted.status, "uploaded");
    } finally {
      await client.close();
    }
  } finally {
    await rm(dbPath, { recursive: true, force: true });
  }
});
