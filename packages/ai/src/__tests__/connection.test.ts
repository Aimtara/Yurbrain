import assert from "node:assert/strict";
import test from "node:test";
import {
  buildConnectionFallback,
  validateConnectionCandidates,
  type ConnectionSource
} from "../connection";

const sources: ConnectionSource[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Desk ritual idea",
    rawContent: "Maya wants her desk to feel calmer with a small daily ritual.",
    topicGuess: "Desk"
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    title: "Minimal lamp reference",
    rawContent: "Saved a warm minimalist desk lamp that feels calming and personal.",
    topicGuess: "Minimal"
  }
];

test("buildConnectionFallback returns grounded candidates for each mode", () => {
  const result = buildConnectionFallback(sources, "idea");

  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0]?.title, "Desk × Minimal idea");
  assert.match(result.candidates[0]?.summary ?? "", /Desk ritual idea/);
  assert.ok(result.candidates[0]?.whyTheseConnect.some((reason) => reason.includes("Maya")));
  assert.equal(result.modelName, "local-stub");
  assert.equal(result.promptVersion, "connection-v1");
});

test("validateConnectionCandidates rejects ungrounded candidates", () => {
  assert.throws(() =>
    validateConnectionCandidates(
      [
        {
          title: "Generic productivity system",
          summary: "This could be a generic idea.",
          whyTheseConnect: ["They are related."],
          suggestedNextActions: ["Do something."],
          confidence: 0.9
        }
      ],
      sources
    )
  );
});
