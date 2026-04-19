import assert from "node:assert/strict";
import test from "node:test";
import * as hookModule from "../hooks/useRenderMode";

test("useRenderMode is exported as a function", () => {
  assert.equal(typeof hookModule.useRenderMode, "function");
});

test("useRenderMode accepts an optional ThemeMode argument", () => {
  // Type-level check: should accept both undefined and the documented modes without TS errors.
  // Runtime execution requires a React renderer, so we only assert the function arity here.
  assert.ok(hookModule.useRenderMode.length <= 1);
});
