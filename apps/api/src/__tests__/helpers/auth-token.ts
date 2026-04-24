import { createSecretKey } from "node:crypto";
import { SignJWT } from "jose";

export const TEST_JWT_SECRET = "yurbrain-test-jwt-secret";
export const TEST_JWT_ISSUER = "https://auth.test.yurbrain.local/v1";
export const TEST_JWT_AUDIENCE = "yurbrain-api";

type TestJwtOptions = {
  expiresInSeconds?: number;
  issuer?: string;
  audience?: string;
};

export async function createTestJwt(userId: string, options: TestJwtOptions = {}): Promise<string> {
  const expiresInSeconds = options.expiresInSeconds ?? 5 * 60;
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + expiresInSeconds;
  const issuer = options.issuer ?? TEST_JWT_ISSUER;
  const audience = options.audience ?? TEST_JWT_AUDIENCE;

  return await new SignJWT({
    ["https://hasura.io/jwt/claims"]: {
      "x-hasura-user-id": userId,
      "x-hasura-default-role": "user",
      "x-hasura-allowed-roles": ["user"]
    }
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(issuedAt)
    .setExpirationTime(expiresAt)
    .sign(createSecretKey(Buffer.from(TEST_JWT_SECRET, "utf8")));
}
