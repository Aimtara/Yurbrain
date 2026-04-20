import assert from "node:assert/strict";
import test from "node:test";

import { bootstrapNhostSession } from "../auth/nhost";

test("bootstrapNhostSession returns disabled without nhost config", async () => {
  const result = await bootstrapNhostSession();
  assert.deepEqual(result, { configured: false });
});
