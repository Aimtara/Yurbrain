import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { getDefaultDatabasePath } from "../paths";

const dataDir = process.env.YURBRAIN_DB_PATH ?? getDefaultDatabasePath();
const parentDir = path.dirname(dataDir);

async function main() {
  await mkdir(parentDir, { recursive: true });

  // Ensure no active process keeps the data directory locked.
  const client = new PGlite({ dataDir });
  await client.close();

  await rm(dataDir, { recursive: true, force: true });
  await mkdir(dataDir, { recursive: true });
  console.log(`Reset DB directory at ${dataDir}`);
}

main().catch((error) => {
  console.error("Failed to reset database directory", error);
  process.exit(1);
});
