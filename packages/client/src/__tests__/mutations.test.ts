import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { configureApiBaseUrl, configureCurrentUserId } from "../api/client";
import {
  createTask,
  finishSession,
  listSessions,
  updateTask,
  type NormalizedMutationError
} from "../hooks/useMutations";

type FetchCall = { url: string; init?: RequestInit };

function installFetch(handler: (call: FetchCall) => Response | Promise<Response>) {
  const calls: FetchCall[] = [];
  (globalThis as { fetch?: unknown }).fetch = async (url: string, init?: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return handler(call);
  };
  return calls;
}

beforeEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId("11111111-1111-4111-8111-111111111111");
});

afterEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId(null);
  delete (globalThis as { fetch?: unknown }).fetch;
});

test("createTask posts JSON payload and resolves with response", async () => {
  const calls = installFetch(() => new Response(JSON.stringify({ id: "t-1" }), { status: 201 }));

  const result = await createTask<{ id: string }>({ title: "Ship" });
  assert.deepEqual(result, { id: "t-1" });
  assert.equal(calls[0]?.url, "/tasks");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(String(calls[0]?.init?.body), JSON.stringify({ title: "Ship" }));
});

test("mutation errors are normalized by status code", async () => {
  installFetch(() => new Response("bad request", { status: 400 }));
  await assertNormalized(() => updateTask("t-1", {}), "VALIDATION");

  installFetch(() => new Response("missing", { status: 404 }));
  await assertNormalized(() => updateTask("t-1", {}), "NOT_FOUND");

  installFetch(() => new Response("boom", { status: 503 }));
  await assertNormalized(() => finishSession("s-1"), "SERVER");

  installFetch(() => new Response("teapot", { status: 418 }));
  await assertNormalized(() => finishSession("s-1"), "UNKNOWN");
});

test("mutation errors without status code fall back to NETWORK", async () => {
  (globalThis as { fetch?: unknown }).fetch = async () => {
    throw new Error("fetch failed");
  };

  await assertNormalized(() => createTask({}), "NETWORK");
});

test("listSessions builds query string from filter fields", async () => {
  const calls = installFetch(() => new Response("[]", { status: 200 }));

  await listSessions({ state: "running" });
  await listSessions({});

  assert.equal(calls[0]?.url, "/sessions?state=running");
  assert.equal(calls[1]?.url, "/sessions");
});

async function assertNormalized(
  action: () => Promise<unknown>,
  expected: NormalizedMutationError["code"]
) {
  try {
    await action();
    assert.fail("Expected mutation to throw");
  } catch (error) {
    const normalized = (error as { normalized?: NormalizedMutationError }).normalized;
    assert.ok(normalized, "Expected normalized error to be attached");
    assert.equal(normalized?.code, expected);
    assert.ok(typeof normalized?.message === "string" && normalized.message.length > 0);
  }
}
