import assert from "node:assert/strict";
import test from "node:test";
import {
  AiSummaryModeSchema,
  BrainItemTypeSchema,
  FeedDensitySchema,
  FeedActionSchema,
  FeedLensSchema,
  FeedCardTypeSchema,
  MessageRoleSchema,
  RenderModeSchema,
  ResurfacingIntensitySchema,
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

test("Feed actions stay within contract", () => {
  assert.equal(FeedActionSchema.parse("convert_to_task"), "convert_to_task");
  assert.throws(() => FeedActionSchema.parse("pin_to_home"));
});

test("Personalization enums stay strict", () => {
  assert.equal(RenderModeSchema.parse("focus"), "focus");
  assert.equal(AiSummaryModeSchema.parse("balanced"), "balanced");
  assert.equal(FeedDensitySchema.parse("compact"), "compact");
  assert.equal(ResurfacingIntensitySchema.parse("active"), "active");
  assert.throws(() => RenderModeSchema.parse("board"));
  assert.throws(() => AiSummaryModeSchema.parse("verbose"));
  assert.throws(() => FeedDensitySchema.parse("dense"));
  assert.throws(() => ResurfacingIntensitySchema.parse("proactive"));
});
