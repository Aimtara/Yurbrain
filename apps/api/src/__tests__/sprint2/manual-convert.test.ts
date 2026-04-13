import assert from "node:assert/strict";
import test from "node:test";

import { createTaskFromManualContent } from "../../services/tasks/manual-convert";

test("createTaskFromManualContent returns todo task with normalized title", () => {
  const result = createTaskFromManualContent({
    userId: "11111111-1111-1111-1111-111111111111",
    sourceItemId: "22222222-2222-2222-2222-222222222222",
    content: "   follow up with design team   "
  });

  assert.equal(result.title, "follow up with design team");
  assert.equal(result.status, "todo");
  assert.equal(result.userId, "11111111-1111-1111-1111-111111111111");
});
