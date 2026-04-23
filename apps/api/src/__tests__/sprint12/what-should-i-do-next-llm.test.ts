import assert from "node:assert/strict";
import test from "node:test";
import { buildWhatShouldIDoNextWithLlm } from "../../services/functions/what-should-i-do-next-llm.ts";
import { setLlmProviderConfigResolverForTests } from "../../services/ai/provider/index.ts";
import type { DbRepository } from "@yurbrain/db";

type BrainItem = Awaited<ReturnType<DbRepository["getBrainItemById"]>>;
type Task = Awaited<ReturnType<DbRepository["listTasks"]>>[number];
type Session = Awaited<ReturnType<DbRepository["listSessions"]>>[number];
type Thread = Awaited<ReturnType<DbRepository["listThreads"]>>[number];
type Message = Awaited<ReturnType<DbRepository["listMessagesByThread"]>>[number];

function createBaseData() {
  const userId = "21111111-1111-1111-1111-111111111111";
  const itemId = "22222222-2222-4222-8222-222222222222";
  const item = {
    id: itemId,
    userId,
    type: "note",
    contentType: "text",
    title: "Finalize migration rollout",
    rawContent: "Need one concrete next move to unblock release and ship safely.",
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
    title: "Complete release migration checklist",
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
    content: "Still waiting on final sign-off before I can proceed.",
    createdAt: "2026-04-02T09:50:00.000Z"
  } as Message;

  return { item, task, session, thread, message };
}

function buildMockRepo(overrides: {
  listTasks?: (query: { userId?: string; status?: "todo" | "in_progress" | "done" }) => Promise<Task[]>;
  listSessions?: (query: { taskId?: string; userId?: string; state?: "running" | "paused" | "finished" }) => Promise<Session[]>;
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
    listArtifactsByItem: async () => [],
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

test("what-should-i-do-next uses provider output when configured", async () => {
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
                summary: "Migration rollout is active with one paused execution point.",
                suggestedNextStep: "Get final sign-off and resume the migration checklist task immediately.",
                reason: "Sign-off is the single blocker to restart execution.",
                sourceSignals: ["Paused session on migration checklist", "Recent user note: waiting on final sign-off"],
                confidence: 0.78
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, false);
    assert.match(result.summary, /migration/i);
    assert.match(result.suggestedNextAction, /resume/i);
    assert.equal(result.confidence, 0.78);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("what-should-i-do-next falls back when provider is not configured", async () => {
  setLlmProviderConfigResolverForTests(() => ({
    enabled: false,
    reason: "missing_api_key"
  }));

  const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id]);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, "not_configured");
  assert.equal(result.confidence, 0.35);
  assert.ok(result.suggestedNextAction.length > 0);
});

test("what-should-i-do-next falls back on timeout", async () => {
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
    const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id], { timeoutMs: 10 });
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "timeout");
    assert.equal(result.confidence, 0.35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("what-should-i-do-next falls back on provider error", async () => {
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
    const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "provider_error");
    assert.equal(result.confidence, 0.35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("what-should-i-do-next falls back on parse failure", async () => {
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
    const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
    assert.equal(result.confidence, 0.35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("what-should-i-do-next falls back when model omits source signals", async () => {
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
                summary: "Next step depends on sign-off.",
                suggestedNextStep: "Ask for final sign-off and then continue.",
                reason: "Execution cannot proceed without approval.",
                sourceSignals: []
              })
            }
          }
        ]
      })
    }) as Response;

  try {
    const result = await buildWhatShouldIDoNextWithLlm(buildMockRepo(), [createBaseData().item.id]);
    assert.equal(result.usedFallback, true);
    assert.equal(result.fallbackReason, "parse_failed");
    assert.equal(result.confidence, 0.35);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("what-should-i-do-next falls back when grounding fails", async () => {
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

  const result = await buildWhatShouldIDoNextWithLlm(repo, [createBaseData().item.id]);
  assert.equal(result.usedFallback, true);
  assert.equal(result.fallbackReason, "provider_error");
  assert.equal(result.confidence, 0.35);
  assert.ok(result.suggestedNextAction.length > 0);
});
