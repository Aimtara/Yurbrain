import assert from "node:assert/strict";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { createServer } from "../../server";

function createDbPath(testName: string): string {
  return path.resolve(process.cwd(), ".yurbrain-data", `${testName}-${process.pid}-${Date.now()}`);
}

function setProductionAuthEnv(input: {
  jwksUrl: string;
  issuer: string;
  audience?: string;
}) {
  const previous = new Map<string, string | undefined>();
  const keys = [
    "NODE_ENV",
    "YURBRAIN_TEST_MODE",
    "NHOST_JWKS_URL",
    "NHOST_JWT_ISSUER",
    "NHOST_JWT_AUDIENCE",
    "NHOST_ANON_KEY",
    "YURBRAIN_NHOST_JWKS_URL",
    "YURBRAIN_NHOST_JWT_ISSUER",
    "YURBRAIN_NHOST_JWT_AUDIENCE",
    "YURBRAIN_NHOST_ANON_KEY"
  ] as const;

  for (const key of keys) {
    previous.set(key, process.env[key]);
    delete process.env[key];
  }

  process.env.NODE_ENV = "production";
  delete process.env.YURBRAIN_TEST_MODE;
  process.env.NHOST_JWKS_URL = input.jwksUrl;
  process.env.NHOST_JWT_ISSUER = input.issuer;
  if (input.audience) {
    process.env.NHOST_JWT_AUDIENCE = input.audience;
  }

  return () => {
    for (const [key, value] of previous.entries()) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

async function createSignedProductionJwt(input: {
  userId: string;
  issuer: string;
  audience?: string;
  privateKey: CryptoKey;
  expiresInSeconds?: number;
  hasuraUserId?: string;
  allowedRoles?: string[];
  defaultRole?: string;
}) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + (input.expiresInSeconds ?? 300);

  const token = new SignJWT({
    "https://hasura.io/jwt/claims": {
      "x-hasura-user-id": input.hasuraUserId ?? input.userId,
      "x-hasura-default-role": input.defaultRole ?? "user",
      "x-hasura-allowed-roles": input.allowedRoles ?? ["user"]
    }
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "test-kid" })
    .setSubject(input.userId)
    .setIssuer(input.issuer)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt);

  if (input.audience) {
    token.setAudience(input.audience);
  }

  return await token.sign(input.privateKey);
}

async function withJwksServer<T>(run: (input: { jwksUrl: string; issuer: string; privateKey: CryptoKey }) => Promise<T>) {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = await exportJWK(publicKey);
  jwk.use = "sig";
  jwk.alg = "RS256";
  jwk.kid = "test-kid";

  const server = createHttpServer((request, response) => {
    if (request.url === "/v1/.well-known/jwks.json") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    response.writeHead(404).end();
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve JWKS server address");
  }

  const issuer = `http://127.0.0.1:${address.port}/v1`;
  const jwksUrl = `${issuer}/.well-known/jwks.json`;

  try {
    return await run({ jwksUrl, issuer, privateKey });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

test("production auth accepts a valid RS256 JWT verified through JWKS", async () => {
  await withJwksServer(async ({ jwksUrl, issuer, privateKey }) => {
    const restoreEnv = setProductionAuthEnv({
      jwksUrl,
      issuer,
      audience: "nhoa_test_audience"
    });
    const dbPath = createDbPath("jwt-production-valid");
    await rm(dbPath, { recursive: true, force: true });
    const server = createServer({ databasePath: dbPath });
    const userId = "c1010101-0101-4101-8101-010101010101";

    try {
      const token = await createSignedProductionJwt({
        userId,
        issuer,
        audience: "nhoa_test_audience",
        privateKey
      });

      const response = await server.app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      assert.equal(response.statusCode, 200);
      assert.deepEqual(response.json<{ id: string; source: string }>(), {
        id: userId,
        source: "authorization"
      });
    } finally {
      restoreEnv();
      await server.app.close();
      await rm(dbPath, { recursive: true, force: true });
    }
  });
});

test("production auth rejects HS256 local test tokens", async () => {
  const dbPath = createDbPath("jwt-production-test-token-rejected");
  await rm(dbPath, { recursive: true, force: true });

  await withJwksServer(async ({ jwksUrl, issuer }) => {
    const restoreEnv = setProductionAuthEnv({
      jwksUrl,
      issuer,
      audience: "nhoa_test_audience"
    });
    const server = createServer({ databasePath: dbPath });

    try {
      const token = [
        Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" }), "utf8").toString("base64url"),
        Buffer.from(
          JSON.stringify({
            sub: randomUUID(),
            iss: issuer,
            aud: "nhoa_test_audience",
            exp: Math.floor(Date.now() / 1000) + 300,
            "https://hasura.io/jwt/claims": {
              "x-hasura-user-id": randomUUID(),
              "x-hasura-default-role": "user",
              "x-hasura-allowed-roles": ["user"]
            }
          }),
          "utf8"
        ).toString("base64url"),
        "invalid-signature"
      ].join(".");

      const response = await server.app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      assert.equal(response.statusCode, 401);
    } finally {
      restoreEnv();
      await server.app.close();
      await rm(dbPath, { recursive: true, force: true });
    }
  });
});

test("production auth rejects JWTs with mismatched Hasura claims", async () => {
  await withJwksServer(async ({ jwksUrl, issuer, privateKey }) => {
    const restoreEnv = setProductionAuthEnv({
      jwksUrl,
      issuer,
      audience: "nhoa_test_audience"
    });
    const dbPath = createDbPath("jwt-production-hasura-claims");
    await rm(dbPath, { recursive: true, force: true });
    const server = createServer({ databasePath: dbPath });
    const userId = "d2020202-0202-4202-8202-020202020202";

    try {
      const token = await createSignedProductionJwt({
        userId,
        issuer,
        audience: "nhoa_test_audience",
        privateKey,
        hasuraUserId: "e3030303-0303-4303-8303-030303030303"
      });

      const response = await server.app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      assert.equal(response.statusCode, 401);
    } finally {
      restoreEnv();
      await server.app.close();
      await rm(dbPath, { recursive: true, force: true });
    }
  });
});

test("production auth rejects JWTs when audience is configured and missing", async () => {
  await withJwksServer(async ({ jwksUrl, issuer, privateKey }) => {
    const restoreEnv = setProductionAuthEnv({
      jwksUrl,
      issuer,
      audience: "nhoa_required_audience"
    });
    const dbPath = createDbPath("jwt-production-missing-audience");
    await rm(dbPath, { recursive: true, force: true });
    const server = createServer({ databasePath: dbPath });
    const userId = "f4040404-0404-4404-8404-040404040404";

    try {
      const token = await createSignedProductionJwt({
        userId,
        issuer,
        privateKey
      });

      const response = await server.app.inject({
        method: "GET",
        url: "/auth/me",
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      assert.equal(response.statusCode, 401);
    } finally {
      restoreEnv();
      await server.app.close();
      await rm(dbPath, { recursive: true, force: true });
    }
  });
});

