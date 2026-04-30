#!/usr/bin/env node

const apiUrl = normalizeBaseUrl(process.env.YURBRAIN_API_URL);
const token = process.env.YURBRAIN_TOKEN_A?.trim();
const badCorsOrigin = process.env.YURBRAIN_BAD_CORS_ORIGIN?.trim();

function normalizeBaseUrl(raw) {
  const value = raw?.trim();
  if (!value) return "";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`${name} is required. Example: ${name}=https://api.staging.example.com`);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, options);
  const text = await response.text();
  return { response, text };
}

function expectStatus(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected HTTP ${expected}, got ${actual}`);
  }
  console.log(`ok - ${label}: HTTP ${actual}`);
}

requireEnv("YURBRAIN_API_URL", apiUrl);
requireEnv("YURBRAIN_TOKEN_A", token);

const live = await request("/health/live");
expectStatus("health/live", live.response.status, 200);

const ready = await request("/health/ready");
expectStatus("health/ready", ready.response.status, 200);

const noToken = await request("/auth/me");
expectStatus("auth/me without token fails closed", noToken.response.status, 401);

const invalidToken = await request("/auth/me", {
  headers: { authorization: "Bearer definitely-invalid-token" }
});
expectStatus("auth/me invalid token fails closed", invalidToken.response.status, 401);

const validToken = await request("/auth/me", {
  headers: { authorization: `Bearer ${token}` }
});
expectStatus("auth/me valid token", validToken.response.status, 200);

if (badCorsOrigin) {
  const badCors = await request("/health/live", {
    headers: { origin: badCorsOrigin }
  });
  expectStatus("bad CORS origin rejected", badCors.response.status, 403);
} else {
  console.log("skip - bad CORS origin: set YURBRAIN_BAD_CORS_ORIGIN to verify rejection");
}

console.log("staging smoke complete");
