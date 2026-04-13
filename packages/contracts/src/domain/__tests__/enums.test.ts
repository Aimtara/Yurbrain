import assert from "node:assert/strict";
import test from "node:test";
import {
  BrainItemTypeSchema,
  FeedLensSchema,
  FeedCardTypeSchema,
  MessageRoleSchema,
  TaskStatusSchema
} from "../domain";

test("BrainItemType enum accepts valid values", () => {
  assert.equal(BrainItemTypeSchema.parse("note"), "note");
  assert.equal(BrainItemTypeSchema.parse("file"), "file");
});

test("Feed enums reject invalid values", () => {
  assert.throws(() => FeedLensSchema.parse("weekly"));
  assert.throws(() => FeedCardTypeSchema.parse("thread"));
});

test("MessageRole and TaskStatus enums stay strict", () => {
  assert.equal(MessageRoleSchema.parse("assistant"), "assistant");
  assert.equal(TaskStatusSchema.parse("in_progress"), "in_progress");
  assert.throws(() => MessageRoleSchema.parse("bot"));
});
