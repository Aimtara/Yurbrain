import { createSecretKey } from "node:crypto";
import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { z } from "zod";
import { sendSafeErrorResponse } from "./observability";

export const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const BEARER_PREFIX = "bearer ";
const UserIdSchema = z.string().uuid();
const HASURA_CLAIMS_NAMESPACE = "https://hasura.io/jwt/claims";
const DEFAULT_TEST_JWT_SECRET = "yurbrain-test-jwt-secret";
const DEFAULT_TEST_JWT_ISSUER = "https://auth.test.yurbrain.local/v1";
const DEFAULT_TEST_JWT_AUDIENCE = "yurbrain-api";
const PRODUCTION_JWT_ALGORITHMS = ["RS256", "RS384", "RS512"] as const;
const TEST_JWT_ALGORITHMS = ["HS256"] as const;

const HasuraClaimsSchema = z.object({
  "x-hasura-user-id": z.string().uuid(),
  "x-hasura-default-role": z.string().min(1),
  "x-hasura-allowed-roles": z.array(z.string().min(1)).nonempty()
});

export type CurrentUserContext = {
  id: string;
  source: "header" | "authorization";
};

declare module "fastify" {
  interface FastifyRequest {
    currentUser?: CurrentUserContext;
  }
}

function parseUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = UserIdSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function trimValue(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function trimTrailingSlash(raw: string): string {
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function isTestAuthMode(): boolean {
  return process.env.NODE_ENV === "test" || process.env.YURBRAIN_TEST_MODE === "1";
}

function buildNhostAuthUrlFromEnv(): string | null {
  const explicitAuthUrl =
    trimValue(process.env.NHOST_AUTH_URL) ?? trimValue(process.env.YURBRAIN_NHOST_AUTH_URL);
  if (explicitAuthUrl) {
    return trimTrailingSlash(explicitAuthUrl);
  }

  const backendUrl =
    trimValue(process.env.NHOST_BACKEND_URL) ?? trimValue(process.env.YURBRAIN_NHOST_BACKEND_URL);
  if (backendUrl) {
    return `${trimTrailingSlash(backendUrl)}/v1/auth`;
  }

  const subdomain =
    trimValue(process.env.NHOST_SUBDOMAIN) ?? trimValue(process.env.YURBRAIN_NHOST_SUBDOMAIN);
  const region =
    trimValue(process.env.NHOST_REGION) ?? trimValue(process.env.YURBRAIN_NHOST_REGION);
  if (subdomain && region) {
    return `https://${subdomain}.auth.${region}.nhost.run/v1`;
  }

  return null;
}

function buildNhostIssuers(): string[] {
  const explicitIssuers = parseCsv(
    trimValue(process.env.NHOST_JWT_ISSUER) ?? trimValue(process.env.YURBRAIN_NHOST_JWT_ISSUER)
  );
  if (explicitIssuers.length > 0) {
    return explicitIssuers;
  }
  const authUrl = buildNhostAuthUrlFromEnv();
  if (!authUrl) return [];
  const issuers = new Set<string>();
  issuers.add(authUrl);
  if (authUrl.endsWith("/auth")) {
    issuers.add(authUrl.slice(0, -"/auth".length));
  }
  return [...issuers];
}

function buildNhostAudience(): string[] {
  const fromJwtAudience = parseCsv(
    trimValue(process.env.NHOST_JWT_AUDIENCE) ?? trimValue(process.env.YURBRAIN_NHOST_JWT_AUDIENCE)
  );
  if (fromJwtAudience.length > 0) return fromJwtAudience;

  const fromAnonKey =
    trimValue(process.env.NHOST_ANON_KEY) ?? trimValue(process.env.YURBRAIN_NHOST_ANON_KEY);
  if (fromAnonKey) return [fromAnonKey];
  return [];
}

function buildNhostJwksUrl(): string | null {
  const explicitJwksUrl =
    trimValue(process.env.NHOST_JWKS_URL) ?? trimValue(process.env.YURBRAIN_NHOST_JWKS_URL);
  if (explicitJwksUrl) {
    return trimTrailingSlash(explicitJwksUrl);
  }
  const authUrl = buildNhostAuthUrlFromEnv();
  if (!authUrl) return null;
  const issuerBase = authUrl.endsWith("/auth") ? authUrl.slice(0, -"/auth".length) : authUrl;
  return `${issuerBase}/.well-known/jwks.json`;
}

function buildTestIssuer(): string {
  return trimValue(process.env.YURBRAIN_TEST_JWT_ISSUER) ?? DEFAULT_TEST_JWT_ISSUER;
}

function buildTestAudience(): string {
  return trimValue(process.env.YURBRAIN_TEST_JWT_AUDIENCE) ?? DEFAULT_TEST_JWT_AUDIENCE;
}

function getTestVerificationKey() {
  return createSecretKey(
    Buffer.from(trimValue(process.env.YURBRAIN_TEST_JWT_SECRET) ?? DEFAULT_TEST_JWT_SECRET, "utf8")
  );
}

function extractBearerToken(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") return null;
  const normalized = authorizationHeader.trim();
  if (!normalized || normalized.length <= BEARER_PREFIX.length) return null;
  if (normalized.slice(0, BEARER_PREFIX.length).toLowerCase() !== BEARER_PREFIX) return null;
  return normalized.slice(BEARER_PREFIX.length).trim();
}

function resolveVerifiedJwtUserId(payload: JWTPayload): string | null {
  const subjectUserId = parseUuid(payload.sub);
  if (!subjectUserId) return null;

  const hasuraClaims = HasuraClaimsSchema.safeParse(payload[HASURA_CLAIMS_NAMESPACE]);
  if (!hasuraClaims.success) return null;
  if (!hasuraClaims.data["x-hasura-allowed-roles"].includes(hasuraClaims.data["x-hasura-default-role"])) {
    return null;
  }

  if (hasuraClaims.data["x-hasura-user-id"] !== subjectUserId) return null;
  return subjectUserId;
}

let cachedJwksResolver: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksUrl: string | null = null;

function getJwksResolver(jwksUrl: string): ReturnType<typeof createRemoteJWKSet> {
  if (cachedJwksResolver && cachedJwksUrl === jwksUrl) {
    return cachedJwksResolver;
  }
  cachedJwksResolver = createRemoteJWKSet(new URL(jwksUrl));
  cachedJwksUrl = jwksUrl;
  return cachedJwksResolver;
}

async function verifyBearerTokenAndResolveUserId(token: string, log?: FastifyBaseLogger): Promise<string | null> {
  try {
    if (isTestAuthMode()) {
      const { payload } = await jwtVerify(token, getTestVerificationKey(), {
        issuer: buildTestIssuer(),
        audience: buildTestAudience(),
        algorithms: [...TEST_JWT_ALGORITHMS]
      });
      return resolveVerifiedJwtUserId(payload);
    }

    const issuers = buildNhostIssuers();
    const audience = buildNhostAudience();
    const jwksUrl = buildNhostJwksUrl();
    if (issuers.length === 0 || !jwksUrl) {
      log?.error?.(
        {
          issuersConfigured: issuers.length > 0,
          audienceConfigured: audience.length > 0,
          jwksConfigured: Boolean(jwksUrl)
        },
        "jwt_validation_misconfigured"
      );
      return null;
    }

    const verificationOptions: {
      issuer: string[];
      audience?: string[];
      algorithms: string[];
    } = {
      issuer: issuers,
      algorithms: [...PRODUCTION_JWT_ALGORITHMS]
    };
    if (audience.length > 0) {
      verificationOptions.audience = audience;
    }

    const { payload } = await jwtVerify(token, getJwksResolver(jwksUrl), verificationOptions);
    return resolveVerifiedJwtUserId(payload);
  } catch (error) {
    const classification = classifyJwtValidationFailure(error);
    log?.info?.(
      {
        event: "jwt_validation_failed",
        reason: classification.reason,
        errorName: classification.errorName
      },
      "jwt_validation_failed"
    );
    return null;
  }
}

function classifyJwtValidationFailure(error: unknown): { reason: string; errorName: string } {
  if (!(error instanceof Error)) {
    return { reason: "unknown", errorName: "UnknownError" };
  }
  const message = error.message.toLowerCase();
  const name = error.name || "Error";
  if (message.includes("expired")) return { reason: "expired_token", errorName: name };
  if (message.includes("signature")) return { reason: "invalid_signature", errorName: name };
  if (message.includes("issuer") || message.includes("audience") || message.includes("claim")) {
    return { reason: "invalid_claims", errorName: name };
  }
  if (message.includes("jwks") || message.includes("fetch") || message.includes("network")) {
    return { reason: "jwks_unreachable", errorName: name };
  }
  return { reason: "invalid_token", errorName: name };
}

async function resolveFromAuthorizationHeader(
  authorizationHeader: unknown,
  log?: FastifyBaseLogger
): Promise<CurrentUserContext | null> {
  const token = extractBearerToken(authorizationHeader);
  if (!token) return null;
  const userId = await verifyBearerTokenAndResolveUserId(token, log);
  if (!userId) return null;
  return { id: userId, source: "authorization" };
}

function canUseHeaderIdentityFallback(): boolean {
  if (!isTestAuthMode()) return false;
  const allowOverride = trimValue(process.env.YURBRAIN_ALLOW_TEST_USER_HEADER);
  return allowOverride !== "0";
}

async function resolveFromHeaders(
  request: FastifyRequest,
  log?: FastifyBaseLogger
): Promise<CurrentUserContext | null> {
  const hasAuthorizationHeader = typeof request.headers.authorization === "string";
  const authorizationUser = await resolveFromAuthorizationHeader(request.headers.authorization, log);
  if (authorizationUser) {
    return authorizationUser;
  }

  // If an Authorization header is present but invalid, do not fall back to user-id headers.
  if (hasAuthorizationHeader) return null;

  if (!canUseHeaderIdentityFallback()) return null;
  const headerUserId = parseUuid(request.headers[CURRENT_USER_HEADER]);
  if (headerUserId) {
    return { id: headerUserId, source: "header" };
  }

  return null;
}

export function registerCurrentUserResolution(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    request.currentUser = (await resolveFromHeaders(request, request.log)) ?? undefined;
  });
}

export function resolveCurrentUser(request: FastifyRequest): CurrentUserContext | null {
  if (request.currentUser) return request.currentUser;
  return null;
}

export function requireCurrentUser(request: FastifyRequest, reply: FastifyReply, log?: FastifyBaseLogger): CurrentUserContext | null {
  const resolved = resolveCurrentUser(request);
  if (!resolved) {
    const allowHeaderHint = canUseHeaderIdentityFallback();
    log?.warn?.(
      {
        event: "auth_required_missing_identity",
        correlationId: (request as { correlationId?: string }).correlationId,
        allowHeaderHint,
        hasAuthorizationHeader: typeof request.headers.authorization === "string"
      },
      "authentication required"
    );
    sendSafeErrorResponse(request as FastifyRequest & { correlationId?: string }, reply, {
      statusCode: 401,
      message: allowHeaderHint
        ? "Current user identity is required. Provide Authorization: Bearer <token> or x-yurbrain-user-id header (test mode only)."
        : "Current user identity is required. Provide Authorization: Bearer <token>.",
      code: "AUTHENTICATION_REQUIRED"
    });
    return null;
  }

  request.currentUser = resolved;
  return resolved;
}

export function canAccessUser(currentUser: CurrentUserContext, resourceUserId: string): boolean {
  return currentUser.id === resourceUserId;
}
