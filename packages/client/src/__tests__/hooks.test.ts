import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { configureApiBaseUrl, configureCurrentUserId } from "../api/client";
import { getFeed } from "../hooks/useFeed";
import { useYurbrainApi } from "../hooks/useYurbrainApi";
import { listBrainItemArtifacts } from "../hooks/useBrainItem";

type FetchCall = { url: string; init?: RequestInit };

function installFetch() {
  const calls: FetchCall[] = [];
  (globalThis as { fetch?: unknown }).fetch = async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response("{}", { status: 200 });
  };
  return calls;
}

beforeEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId(null);
});

afterEach(() => {
  configureApiBaseUrl(null);
  configureCurrentUserId(null);
  delete (globalThis as { fetch?: unknown }).fetch;
});

test("getFeed builds query string from provided options", async () => {
  const calls = installFetch();
  await getFeed({ lens: "focus", limit: 10, includeSnoozed: true });
  const url = calls[0]!.url;
  assert.ok(url.startsWith("/feed?"), `unexpected url ${url}`);
  const params = new URLSearchParams(url.slice(url.indexOf("?") + 1));
  assert.equal(params.get("lens"), "focus");
  assert.equal(params.get("limit"), "10");
  assert.equal(params.get("includeSnoozed"), "true");
});

test("getFeed omits query string when no options provided", async () => {
  const calls = installFetch();
  await getFeed();
  assert.equal(calls[0]?.url, "/feed");
});

test("useYurbrainApi helpers compose expected paths and bodies", async () => {
  const calls = installFetch();
  const api = useYurbrainApi();

  await api.dismissFeedCard("card-1");
  await api.snoozeFeedCard("card-2", 30);
  await api.refreshFeedCard("card-3");
  await api.startTaskSession("task-7");
  await api.pauseSession("sess-8");
  await api.finishSession("sess-9");
  await api.updateTask("task-10", { status: "in_progress" });
  await api.getUserPreference();

  assert.equal(calls[0]?.url, "/feed/card-1/dismiss");
  assert.equal(calls[0]?.init?.method, "POST");
  assert.equal(calls[1]?.url, "/feed/card-2/snooze");
  assert.equal(String(calls[1]?.init?.body), JSON.stringify({ minutes: 30 }));
  assert.equal(calls[2]?.url, "/feed/card-3/refresh");
  assert.equal(calls[3]?.url, "/tasks/task-7/start");
  assert.equal(calls[4]?.url, "/sessions/sess-8/pause");
  assert.equal(calls[5]?.url, "/sessions/sess-9/finish");
  assert.equal(calls[6]?.url, "/tasks/task-10");
  assert.equal(calls[6]?.init?.method, "PATCH");
  assert.equal(calls[7]?.url, "/preferences/me");
});

test("listBrainItemArtifacts encodes optional type filter", async () => {
  const calls = installFetch();
  await listBrainItemArtifacts("item-1");
  await listBrainItemArtifacts("item-2", "summary");

  assert.equal(calls[0]?.url, "/brain-items/item-1/artifacts");
  assert.equal(calls[1]?.url, "/brain-items/item-2/artifacts?type=summary");
});
