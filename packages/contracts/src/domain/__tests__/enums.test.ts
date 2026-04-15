import assert from "node:assert/strict";
import test from "node:test";
import {
  AiSummaryModeSchema,
  BrainItemTypeSchema,
  ExploreNodeSchema,
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

test("Explore node contract validates cluster and layout metadata", () => {
  const parsed = ExploreNodeSchema.parse({
    clusterId: "memory-cluster-1",
    position: { x: 12.5, y: -3.2 },
    salience: 0.72,
    grouping: {
      autoGroupId: "auto-group-a",
      manualGroupId: "manual-group-alpha",
      manualGroupLabel: "Weekly synthesis"
    },
    relationships: [
      {
        targetItemId: "11111111-1111-1111-1111-111111111111",
        kind: "related",
        weight: 0.8
      }
    ]
  });

  assert.equal(parsed.clusterId, "memory-cluster-1");
  assert.equal(parsed.grouping.manualGroupLabel, "Weekly synthesis");
  assert.equal(parsed.relationships[0]?.kind, "related");
  assert.throws(() =>
    ExploreNodeSchema.parse({
      clusterId: "memory-cluster-1",
      position: { x: Number.NaN, y: 0 },
      salience: 0.5,
      grouping: {
        autoGroupId: null,
        manualGroupId: null,
        manualGroupLabel: null
      },
      relationships: []
    })
  );
});
