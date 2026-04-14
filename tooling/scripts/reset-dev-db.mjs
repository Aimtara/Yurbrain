import { runPnpmCommand } from "./dev-db-common.mjs";

async function main() {
  await runPnpmCommand(["--filter", "@yurbrain/db", "db:reset"]);
}

main().catch((error) => {
  console.error("Failed to reset Yurbrain dev database", error);
  process.exit(1);
});
