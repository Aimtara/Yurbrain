import assert from "node:assert/strict";
import test from "node:test";
import { tokens } from "../design/tokens";
import { theme } from "../design/theme";

test("design tokens expose the required token groups", () => {
  assert.ok(tokens.colors);
  assert.ok(tokens.space);
  assert.ok(tokens.radius);
});

test("color tokens are hex strings", () => {
  for (const [name, value] of Object.entries(tokens.colors)) {
    assert.match(value, /^#[0-9a-fA-F]{3,8}$/, `${name} should be a hex color`);
  }
});

test("space and radius tokens are non-negative integers", () => {
  for (const [name, value] of Object.entries(tokens.space)) {
    assert.equal(Number.isInteger(value), true, `${name} should be an integer`);
    assert.ok(value >= 0, `${name} should be >= 0`);
  }
  for (const [name, value] of Object.entries(tokens.radius)) {
    assert.equal(Number.isInteger(value), true, `${name} should be an integer`);
    assert.ok(value >= 0, `${name} should be >= 0`);
  }
});

test("theme exposes light and dark modes sharing the token set", () => {
  assert.equal(theme.light, tokens);
  assert.equal(theme.dark, tokens);
  const modes: ("light" | "dark")[] = ["light", "dark"];
  for (const mode of modes) {
    assert.equal(theme[mode].colors.bg, tokens.colors.bg);
  }
});
