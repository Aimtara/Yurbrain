import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { apiClient, configureApiBaseUrl } from "../api/client";

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
  delete (globalThis as { __YURBRAIN_API_BASE_URL?: unknown }).__YURBRAIN_API_BASE_URL;
});

afterEach(() => {
  configureApiBaseUrl(null);
  delete (globalThis as { fetch?: unknown }).fetch;
  delete (globalThis as { __YURBRAIN_API_BASE_URL?: unknown }).__YURBRAIN_API_BASE_URL;
});

test("apiClient uses relative path when no base URL is configured", async () => {
  const calls = installFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));

  const result = await apiClient<{ ok: boolean }>("/feed");
  assert.deepEqual(result, { ok: true });
  assert.equal(calls[0]?.url, "/feed");
});

test("configureApiBaseUrl trims trailing slash and prefixes request paths", async () => {
  configureApiBaseUrl("https://api.example.com/");
  const calls = installFetch(() => new Response("{}", { status: 200 }));

  await apiClient<unknown>("/brain-items");
  await apiClient<unknown>("preferences/user-1");

  assert.equal(calls[0]?.url, "https://api.example.com/brain-items");
  assert.equal(calls[1]?.url, "https://api.example.com/preferences/user-1");
});

test("configureApiBaseUrl(null) resets to relative paths and ignores blank strings", async () => {
  configureApiBaseUrl("https://api.example.com");
  configureApiBaseUrl("   ");
  const calls = installFetch(() => new Response("{}", { status: 200 }));

  await apiClient<unknown>("/feed");
  assert.equal(calls[0]?.url, "/feed");
});

test("apiClient keeps absolute URLs unchanged even when base URL is configured", async () => {
  configureApiBaseUrl("https://api.example.com");
  const calls = installFetch(() => new Response("{}", { status: 200 }));

  await apiClient<unknown>("https://other.example.com/health");
  assert.equal(calls[0]?.url, "https://other.example.com/health");
});

test("apiClient resolves base URL from globalThis when not explicitly configured", async () => {
  (globalThis as { __YURBRAIN_API_BASE_URL?: unknown }).__YURBRAIN_API_BASE_URL = "https://global.example.com/";
  const calls = installFetch(() => new Response("{}", { status: 200 }));

  await apiClient<unknown>("/feed");
  assert.equal(calls[0]?.url, "https://global.example.com/feed");
});

test("apiClient throws informative error on non-OK responses", async () => {
  installFetch(() => new Response("boom", { status: 500 }));

  await assert.rejects(() => apiClient<unknown>("/feed"), /Request failed: 500/);
});
