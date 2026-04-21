import { createDbRepository } from "../index";
import { getDefaultDatabasePath, getDefaultMigrationsPath } from "../paths";

const databasePath = process.env.YURBRAIN_DB_PATH ?? getDefaultDatabasePath();
const migrationsPath = process.env.YURBRAIN_MIGRATIONS_PATH ?? getDefaultMigrationsPath();
const batchSize = Number(process.env.YURBRAIN_N5_BACKFILL_BATCH_SIZE ?? "200");
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const repo = createDbRepository({ databasePath, migrationsPath });
  try {
    const pending = await repo.listUserProfilesNeedingBackfill(batchSize);
    if (dryRun) {
      console.log(`N5 profile backfill scaffold dry-run found ${pending.length} users`);
      return;
    }
    for (const userId of pending) {
      await repo.markUserProfileBackfilled(userId, "n5_scaffold_script");
    }
    console.log(`N5 profile backfill scaffold processed ${pending.length} users`);
  } finally {
    await repo.close();
  }
}

main().catch((error) => {
  console.error("Failed to run N5 profile backfill scaffold", error);
  process.exit(1);
});
