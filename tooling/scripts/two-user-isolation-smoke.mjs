#!/usr/bin/env node

const apiUrl = normalizeBaseUrl(process.env.YURBRAIN_API_URL);
const tokenA = trim(process.env.YURBRAIN_TOKEN_A);
const tokenB = trim(process.env.YURBRAIN_TOKEN_B);

if (!apiUrl || !tokenA || !tokenB) {
  failPrerequisite([
    "Set YURBRAIN_API_URL, YURBRAIN_TOKEN_A, and YURBRAIN_TOKEN_B before running two-user isolation smoke.",
    "Use two real staging users. Never commit tokens to git."
  ]);
}

const uniqueText = `two-user isolation smoke ${new Date().toISOString()}`;

const checks = [
  {
    name: "User A creates capture",
    run: async () => {
      const response = await request("/capture/intake", {
        method: "POST",
        token: tokenA,
        json: {
          type: "text",
          content: uniqueText,
          topicGuess: "staging-isolation-smoke"
        }
      });
      expectStatus(response, 201);
      const body = await response.json();
      if (!body.itemId) throw new Error("Capture response did not include itemId");
      state.itemId = body.itemId;
    }
  },
  {
    name: "User A can read own item",
    run: async () => {
      const response = await request(`/brain-items/${encodeURIComponent(state.itemId)}`, { token: tokenA });
      expectStatus(response, 200);
      const body = await response.json();
      if (body.id !== state.itemId) throw new Error("User A read returned wrong item");
    }
  },
  {
    name: "User B cannot read User A item",
    run: async () => {
      const response = await request(`/brain-items/${encodeURIComponent(state.itemId)}`, { token: tokenB });
      expectStatus(response, 404);
    }
  },
  {
    name: "User B search does not reveal User A item",
    run: async () => {
      const response = await request(`/brain-items?q=${encodeURIComponent(uniqueText)}`, { token: tokenB });
      expectStatus(response, 200);
      const body = await response.json();
      if (Array.isArray(body) && body.some((entry) => entry?.id === state.itemId)) {
        throw new Error("User B search revealed User A item");
      }
    }
  },
  {
    name: "User A feed can include own capture",
    run: async () => {
      const response = await request("/functions/feed?lens=all&limit=20", { token: tokenA });
      expectStatus(response, 200);
      const body = await response.json();
      if (!Array.isArray(body)) throw new Error("Feed response was not an array");
    }
  }
];

const state = { itemId: "" };

for (const check of checks) {
  try {
    await check.run();
    console.log(`PASS ${check.name}`);
  } catch (error) {
    console.error(`FAIL ${check.name}`);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    break;
  }
}

function trim(value) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : "";
}

function normalizeBaseUrl(value) {
  const normalized = trim(value);
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function failPrerequisite(lines) {
  for (const line of lines) console.error(line);
  process.exit(2);
}

async function request(path, options = {}) {
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${options.token}`
  };
  return fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.json === undefined ? undefined : JSON.stringify(options.json)
  });
}

function expectStatus(response, expected) {
  if (response.status !== expected) {
    throw new Error(`Expected HTTP ${expected}, received ${response.status}`);
  }
}
