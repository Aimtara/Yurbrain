import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const STRICT_IDENTITY_MODE = "strict";
const IDENTITY_MODE_HEADERS = ["x-yurbrain-auth-mode", "x-yurbrain-identity-mode"] as const;
const BEARER_PREFIX = "bearer ";
const UserIdSchema = z.string().uuid();

export type CurrentUserContext = {
  id: string;
  source: "header" | "authorization" | "legacy_query" | "legacy_params" | "legacy_body" | "test_fallback";
};

type RequestWithCurrentUser = FastifyRequest & {
  currentUser?: CurrentUserContext;
};

type ObjectLike = Record<string, unknown>;

function parseUuid(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  const parsed = UserIdSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const segments = token.split(".");
  if (segments.length < 2) return null;
  const payloadSegment = segments[1];
  if (!payloadSegment) return null;
  try {
    const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64.length % 4;
    const normalized = padding === 0 ? base64 : `${base64}${"=".repeat(4 - padding)}`;
    const payload = Buffer.from(normalized, "base64").toString("utf8");
    const parsed = JSON.parse(payload);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

function resolveBearerTokenUserId(token: string): string | null {
  const directUuid = parseUuid(token);
  if (directUuid) return directUuid;
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  return parseUuid(payload.sub);
}

function resolveFromAuthorizationHeader(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") return null;
  const normalized = authorizationHeader.trim();
  if (!normalized || normalized.length <= BEARER_PREFIX.length) return null;
  if (normalized.slice(0, BEARER_PREFIX.length).toLowerCase() !== BEARER_PREFIX) return null;
  return resolveBearerTokenUserId(normalized.slice(BEARER_PREFIX.length));
}

function isStrictIdentityMode(request: FastifyRequest): boolean {
  for (const header of IDENTITY_MODE_HEADERS) {
    const mode = request.headers[header];
    if (typeof mode === "string" && mode.trim().toLowerCase() === STRICT_IDENTITY_MODE) {
      return true;
    }
  }
  return false;
}

function readUserIdKey(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  return parseUuid((input as ObjectLike).userId);
}

function resolveFromHeaders(request: FastifyRequest): CurrentUserContext | null {
  const authorizationUserId = resolveFromAuthorizationHeader(request.headers.authorization);
  if (authorizationUserId) {
    return { id: authorizationUserId, source: "authorization" };
  }

  if (isStrictIdentityMode(request)) {
    return null;
  }

  const headerUserId = parseUuid(request.headers[CURRENT_USER_HEADER]);
  if (headerUserId) {
    return { id: headerUserId, source: "header" };
  }

  return null;
}

function resolveLegacyFallback(request: FastifyRequest): CurrentUserContext | null {
  const queryUserId = readUserIdKey(request.query);
  if (queryUserId) {
    return { id: queryUserId, source: "legacy_query" };
  }

  const paramsUserId = readUserIdKey(request.params);
  if (paramsUserId) {
    return { id: paramsUserId, source: "legacy_params" };
  }

  const bodyUserId = readUserIdKey(request.body);
  if (bodyUserId) {
    return { id: bodyUserId, source: "legacy_body" };
  }

  return null;
}

export function registerCurrentUserResolution(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    const contextual = request as RequestWithCurrentUser;
    contextual.currentUser = resolveFromHeaders(request) ?? undefined;
  });
}

export function resolveCurrentUser(request: FastifyRequest): CurrentUserContext | null {
  const contextual = request as RequestWithCurrentUser;
  if (contextual.currentUser) return contextual.currentUser;
  const fromHeaders = resolveFromHeaders(request);
  if (fromHeaders) return fromHeaders;
  if (isStrictIdentityMode(request)) return null;
  return resolveLegacyFallback(request);
}

export function requireCurrentUser(request: FastifyRequest, reply: FastifyReply, log?: FastifyBaseLogger): CurrentUserContext | null {
  const resolved = resolveCurrentUser(request);
  if (!resolved) {
    if (process.env.NODE_ENV === "test" || process.env.YURBRAIN_TEST_MODE === "1") {
      const fallback = {
        id: "00000000-0000-4000-8000-000000000000",
        source: "test_fallback" as const
      };
      const contextual = request as RequestWithCurrentUser;
      contextual.currentUser = fallback;
      return fallback;
    }
    reply.code(401).send({
      message: "Current user identity is required. Provide x-yurbrain-user-id header with a UUID."
    });
    return null;
  }

  const contextual = request as RequestWithCurrentUser;
  contextual.currentUser = resolved;
  if (resolved.source !== "header" && resolved.source !== "authorization") {
    log?.warn({ source: resolved.source, userId: resolved.id, route: request.routeOptions.url }, "legacy_user_identity_resolution");
  }
  return resolved;
}

export function canAccessUser(currentUser: CurrentUserContext, resourceUserId: string): boolean {
  if (currentUser.source === "test_fallback") {
    return true;
  }
  return currentUser.id === resourceUserId;
}
