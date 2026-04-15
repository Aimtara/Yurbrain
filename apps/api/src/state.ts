import path from "node:path";
import { existsSync } from "node:fs";
import { createDbRepository, type CreateRepositoryOptions, type DbRepository } from "../../../packages/db/src";

export type {
  ArtifactRecord,
  BrainItemRecord,
  EventRecord,
  FeedCardRecord,
  MessageRecord,
  SessionRecord,
  TaskRecord,
  ThreadRecord,
  UserPreferenceRecord
} from "../../../packages/db/src";

export type AppState = {
  repo: DbRepository;
};

function resolveWorkspaceRoot(): string {
  if (process.env.YURBRAIN_WORKSPACE_ROOT) {
    return process.env.YURBRAIN_WORKSPACE_ROOT;
  }
  const cwd = process.cwd();
  if (existsSync(path.resolve(cwd, "packages/db/migrations"))) {
    return cwd;
  }
  const parentWorkspace = path.resolve(cwd, "../..");
  if (existsSync(path.resolve(parentWorkspace, "packages/db/migrations"))) {
    return parentWorkspace;
  }
  return cwd;
}

function defaultDatabasePath(): string {
  if (process.env.YURBRAIN_DB_PATH) {
    return process.env.YURBRAIN_DB_PATH;
  }
  const workspaceRoot = resolveWorkspaceRoot();
  const isTestRun =
    process.env.NODE_ENV === "test" ||
    process.env.YURBRAIN_TEST_MODE === "1" ||
    process.env.npm_lifecycle_event === "test" ||
    process.env.VITEST !== undefined ||
    process.execArgv.includes("--test") ||
    process.argv.some((arg) => arg.includes("--test") || arg.includes(".test."));
  if (isTestRun) {
    return path.resolve(workspaceRoot, ".yurbrain-data", `test-${process.pid}`);
  }
  return path.resolve(workspaceRoot, ".yurbrain-data", "runtime");
}

function defaultMigrationsPath(): string {
  return path.resolve(resolveWorkspaceRoot(), "packages/db/migrations");
}

export function createState(options: CreateRepositoryOptions = {}): AppState {
  return {
    repo: createDbRepository({
      databasePath: options.databasePath ?? defaultDatabasePath(),
      migrationsPath: options.migrationsPath ?? defaultMigrationsPath()
    })
  };
}
