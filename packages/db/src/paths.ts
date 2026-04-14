import { existsSync } from "node:fs";
import path from "node:path";

function hasWorkspaceLayout(root: string): boolean {
  return existsSync(path.resolve(root, "packages/db/migrations"));
}

export function resolveWorkspaceRoot(): string {
  if (process.env.YURBRAIN_WORKSPACE_ROOT) {
    return process.env.YURBRAIN_WORKSPACE_ROOT;
  }

  const cwd = process.cwd();
  if (hasWorkspaceLayout(cwd)) {
    return cwd;
  }

  const parentWorkspace = path.resolve(cwd, "../..");
  if (hasWorkspaceLayout(parentWorkspace)) {
    return parentWorkspace;
  }

  return cwd;
}

export function getDefaultDatabasePath(): string {
  return path.resolve(resolveWorkspaceRoot(), ".yurbrain-data", "runtime");
}

export function getDefaultMigrationsPath(): string {
  return path.resolve(resolveWorkspaceRoot(), "packages/db/migrations");
}
