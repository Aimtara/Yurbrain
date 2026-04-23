import assert from "node:assert/strict";
import test from "node:test";
import { buildSummarizeProgressWithLlm } from "../../services/functions/summarize-progress-llm.ts";
import { setLlmProviderConfigResolverForTests } from "../../services/ai/provider/index.ts";
import type { DbRepository } from "@yurbrain/db";

type BrainItem = Awaited<ReturnType<DbRepository["getBrainItemById"]>>;
type Task = Awaited<ReturnType<DbRepository["listTasks"]>>[number];
type Session = Awaited<ReturnType<DbRepository["listSessions"]>>[number];
type Thread = Awaited<ReturnType<DbRepository["listThreads"]>>[number];
type Message = Awaited<ReturnType<DbRepository["listMessagesByThread"]>>[number];
type Artifact = Awaited<ReturnType<DbRepository["listArtifactsByItem"]>>[number];

function createBaseData() {
  const userId = "11111111-1111-1111-1111-111111111111";
  const itemId = "22222222-2222-4222-8222-222222222222";
  const item = {
    id: itemId,
    userId,
    type: "note",
    contentType: "text",
    title: "Ship migration summary",
    rawContent: "Blocked waiting for approval on release checklist.",
    sourceApp: null,
    sourceLink: null,
    previewTitle: null,
    previewDescription: null,
    previewImageUrl: null,
    note: null,
    topicGuess: "Migration",
    recencyWeight: 1,
    clusterKey: null,
    founderModeAtCapture: false,
    executionMetadata: null,
    status: "active",
    createdAt: "2026-04-01T10:00:00.000Z",
    updatedAt: "2026-04-02T10:00:00.000Z"
  } as NonNullable<BrainItem>;

  const task = {
    id: "33333333-3333-4333-8333-333333333333",
    userId,
    sourceItemId: itemId,
    sourceMessageId: null,
    title: "Finalize migration review",
    status: "in_progress",
    createdAt: "2026-04-02T09:00:00.000Z",
    updatedAt: "2026-04-02T10:00:00.000Z"
  } as Task;

  const session = {
    id: "44444444-4444-4444-8444-444444444444",
    taskId: task.id,
    state: "paused",
    startedAt: "2026-04-02T09:30:00.000Z",
    endedAt: null
  } as Session;

  const thread = {
    id: "55555555-5555-4555-8555-555555555555",
    targetItemId: itemId,
    kind: "item_comment",
    createdAt: "2026-04-02T09:40:00.000Z",
    updatedAt: "2026-04-02T10:00:00.000Z"
  } as Thread;

  const message = {
    id: "66666666-6666-4666-8666-666666666666",
    threadId: thread.id,
    role: "user",
    content: "Still blocked until approval lands.",
    createdAt: "2026-04-02T09:50:00.000Z"
  } as Message;

  const artifact = {
    id: "77777777-7777-4777-8777-777777777777",
    itemId,
    userId,
    type: "summary",
    payload: { content: "Migration thread is active and waiting on release sign-off." },
    confidence: 0.6,
    createdAt: "2026-04-02T09:45:00.000Z"
  } as Artifact;

  return { item, task, session, thread, message, artifact };
}

function buildMockRepo(overrides: {
  listTasks?: (query: { userId?: string; status?: "todo" | "in_progress" | "done" }) => Promise<Task[]>;
  listSessions?: (query: { taskId?: string; userId?: string; state?: "running" | "paused" | "finished" }) => Promise<Session[]>;
  listArtifactsByItem?: (itemId: string, query?: { type?: "summary" | "classification" | "relation" | "feed_card" }) => Promise<Artifact[]>;
  listMessagesByThread?: (threadId: string) => Promise<Message[]>;
} = {}): DbRepository {
  const base = createBaseData();
  return {
    close: async () => undefined,
    createBrainItem: async () => {
      throw new Error("not used");
    },
    getBrainItemById: async (id) => (id === base.item.id ? base.item : null),
    listBrainItemsByUser: async () => [base.item],
    updateBrainItem: async () => null,
    appendEvent: async () => {
      throw new Error("not used");
    },
    listEventsByUser: async () => [],
    createThread: async () => {
      throw new Error("not used");
    },
    getThreadById: async () => null,
    listThreads: async (targetItemId) => (targetItemId === base.item.id ? [base.thread] : []),
    createMessage: async () => {
      throw new Error("not used");
    },
    listMessagesByThread: overrides.listMessagesByThread ?? (async (threadId) => (threadId === base.thread.id ? [base.message] : [])),
    createFeedCard: async () => {
      throw new Error("not used");
    },
    getFeedCardById: async () => null,
    listFeedCardsByUser: async () => [],
    updateFeedCard: async () => null,
    createTask: async () => {
      throw new Error("not used");
    },
    getTaskById: async () => null,
    updateTask: async () => null,
    listTasks: overrides.listTasks ?? (async () => [base.task]),
    createSession: async () => {
      throw new Error("not used");
    },
    getSessionById: async () => null,
    findActiveSessionByTaskId: async () => null,
    listSessions: overrides.listSessions ?? (async () => [base.session]),
    updateSession: async () => null,
    createArtifact: async () => {
      throw new Error("not used");
    },
    getArtifactById: async () => null,
    listArtifactsByItem: overrides.listArtifactsByItem ?? (async () => [base.artifact]),
    getUserProfileById: async () => null,
    upsertUserProfile: async () => {
      throw new Error("not used");
    },
    listUserProfilesNeedingBackfill: async () => [],
    markUserProfileBackfilled: async () => {
      throw new Error("not used");
    },
    getUserPreference: async () => null,
    upsertUserPreference: async () => {
      throw new Error("not used");
    }
  };
}

test.afterEach(() => {
  setLlmProviderConfigResolverForTests(null);
});

function createLoggerCapture() {
  const infoEntries: Array<{ payload: Record<string, unknown>; message: string }> = [];
  const warnEntries: Array<{ payload: Record<string, unknown>; message: string }> = [];
  return {
    logger: {
      info(payload: Record<string, unknown>, message: string) {
        infoEntries.push({ payload, message });
      },
      warn(payload: Record<string, unknown>, message: string) {
        warnEntries.push({ payload, message });
      }
    },
    infoEntries,
    warnEntries
  };
}

test("summarize-progress uses provider output when configured", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Progress centers on migration checklist completion and paused execution.",
                blockers: ["Waiting for release approval"],
                suggestedNextStep: "Get release approval, then resume the paused migration session.",
                sourceSignals: ["Paused session on Finalize migration review", "Recent note: blocked until approval lands"],
                reason: "Approval is the single blocker preventing immediate forward motion."
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, false);
    assert.match(result.summary, /migration/i);
    assert.equal(result.blockers?.length, 1);
    assert.match(result.suggestedNextAction, /resume/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back when provider is not configured", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: false,
    reason: "missing_api_key"
  }));

  const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, "not_configured");
  assert.ok(result.summary.length > 0);
  assert.ok(result.suggestedNextAction.length > 0);
});

test("summarize-progress falls back on timeout", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 20,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        const abortError = new Error("aborted");
        abortError.name = "AbortError";
        reject(abortError);
      });
    }) as Promise<Response>;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id], { timeoutMs: 10 });
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "timeout");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back on provider error", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: false,
      status: 503,
      json: async () => ({})
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "provider_error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back on parse failure", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "not-json" } }]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back when model omits source signals", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Progress is blocked on one dependency.",
                blockers: ["Waiting for final sign-off"],
                suggestedNextStep: "Get sign-off and continue implementation.",
                sourceSignals: [],
                reason: "No sign-off means no safe next execution step."
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back when grounding fails", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const repo = buildMockRepo({
    listTasks: async () => {
      throw new Error("task read failed");
    }
  });

  const result = await buildSummarizeProgressWithLlm(repo, [createBaseData().item.id]);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, "provider_error");
  assert.ok(result.summary.length > 0);
});

test("summarize-progress logs fallback classification with stage", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: "not-json" } }]
      })
    }) as Response;

  const { logger, warnEntries } = createLoggerCapture();
  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id], {
      log: logger as unknown as import("fastify").FastifyBaseLogger
    });
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
    assert.ok(warnEntries.length >= 1);
    const latest = warnEntries.at(-1);
    assert.equal(latest?.payload.fallbackReason, "parse_failed");
    assert.equal(latest?.payload.fallbackStage, "parse");
    assert.equal(typeof latest?.payload.durationMs, "number");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress maps invalid provider response to parse_failed", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress sanitizes overlong provider output fields", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const summaryLong = "s".repeat(500);
  const nextStepLong = "n".repeat(240);
  const reasonLong = "r".repeat(240);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: summaryLong,
                blockers: ["ok"],
                suggestedNextStep: nextStepLong,
                sourceSignals: ["sig"],
                reason: reasonLong
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, false);
    assert.ok(result.summary.length <= 420);
    assert.ok((result.suggestedNextAction ?? "").length <= 220);
    assert.ok((result.reason ?? "").length <= 220);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress sanitizes overlong blocker and source signal entries", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const blockerLong = "b".repeat(180);
  const signalLong = "g".repeat(200);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Short summary",
                blockers: [blockerLong],
                suggestedNextStep: "Short next step",
                sourceSignals: [signalLong],
                reason: "Short reason"
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, false);
    assert.ok((result.blockers ?? []).every((entry) => entry.length <= 140));
    assert.ok((result.sourceSignals ?? []).every((entry) => entry.length <= 160));
    assert.ok((result.blockers ?? []).length <= 3);
    assert.ok((result.sourceSignals ?? []).length <= 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("summarize-progress falls back when provider output is generic/non-grounded", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: true,
    provider: "openai",
    apiKey: "test-key",
    baseUrl: "https://example.test/v1",
    model: "gpt-test",
    timeoutMs: 2_000,
    maxOutputTokens: 220,
    temperature: 0.2
  }));

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Keep making progress and stay focused.",
                blockers: [],
                suggestedNextStep: "Continue improving things.",
                sourceSignals: ["Keep going"],
                reason: "This is generally good practice."
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildSummarizeProgressWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
