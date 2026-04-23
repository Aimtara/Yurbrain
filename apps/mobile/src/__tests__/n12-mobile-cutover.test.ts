import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import path from "node:path";

import { mobileStorageKeys } from "../features/shared/constants";
import { getStoredState, setStoredState } from "../features/shared/storage";

test("mobile provider enforces nhost transport options", () => {
  const providerSourcePath = path.resolve(
    process.cwd(),
    "src/providers/YurbrainClientProvider.tsx"
  );
  const providerSource = fs.readFileSync(providerSourcePath, "utf8");

  assert.ok(
    providerSource.includes(
      "<SharedYurbrainClientProvider options={{ transport: \"nhost\" }}>"
    )
  );
});

test("mobile app roots UI under local Yurbrain client provider wrapper", () => {
  const appSourcePath = path.resolve(
    process.cwd(),
    "src/App.tsx"
  );
  const appSource = fs.readFileSync(appSourcePath, "utf8");

  assert.ok(
    appSource.includes(
      'import { YurbrainClientProvider } from "./providers/YurbrainClientProvider";'
    )
  );
  assert.ok(appSource.includes("<YurbrainClientProvider>"));
  assert.ok(!appSource.includes("NhostProvider"));
  assert.ok(!appSource.includes("NhostClient"));
});

test("mobile loop controller enforces verified-current-user bootstrap gate", () => {
  const controllerSourcePath = path.resolve(
    process.cwd(),
    "src/features/shell/useMobileLoopController.ts"
  );
  const controllerSource = fs.readFileSync(controllerSourcePath, "utf8");

  assert.ok(controllerSource.includes("const [bootstrapLoading, setBootstrapLoading] = useState(true);"));
  assert.ok(controllerSource.includes("const [bootstrapError, setBootstrapError] = useState(\"\");"));
  assert.ok(controllerSource.includes("await yurbrainClient.getCurrentUser<{ id: string }>();"));
  assert.ok(controllerSource.includes("if (!hydrated || bootstrapLoading || bootstrapError) return;"));
});

test("mobile storage helpers round-trip persisted values", () => {
  const memory = new Map<string, string>();
  (globalThis as { localStorage?: { getItem: (key: string) => string | null; setItem: (key: string, value: string) => void } }).localStorage = {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => {
      memory.set(key, value);
    }
  };

  setStoredState(mobileStorageKeys.founderMode, true);
  const founderMode = getStoredState<boolean>(mobileStorageKeys.founderMode);
  assert.equal(founderMode, true);
});
