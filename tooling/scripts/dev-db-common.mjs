import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const workspaceRoot = path.resolve(scriptDir, "../..");

function dbPath() {
  return process.env.YURBRAIN_DB_PATH ?? path.resolve(workspaceRoot, ".yurbrain-data", "runtime");
}

function migrationsPath() {
  return process.env.YURBRAIN_MIGRATIONS_PATH ?? path.resolve(workspaceRoot, "packages/db/migrations");
}

export function createDbScriptEnv() {
  return {
    ...process.env,
    YURBRAIN_WORKSPACE_ROOT: process.env.YURBRAIN_WORKSPACE_ROOT ?? workspaceRoot,
    YURBRAIN_DB_PATH: dbPath(),
    YURBRAIN_MIGRATIONS_PATH: migrationsPath()
  };
}

export async function runPnpmCommand(args) {
  await new Promise((resolve, reject) => {
    const child = spawn("pnpm", args, {
      cwd: workspaceRoot,
      env: createDbScriptEnv(),
      stdio: "inherit"
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`pnpm ${args.join(" ")} failed with exit code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}
