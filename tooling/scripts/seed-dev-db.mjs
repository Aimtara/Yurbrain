import { runPnpmCommand } from "./dev-db-common.mjs";

async function main() {
  await runPnpmCommand(["--filter", "@yurbrain/db", "db:seed"]);
}

main().catch((error) => {
  console.error("Failed to seed Yurbrain dev database", error);
  process.exit(1);
});
