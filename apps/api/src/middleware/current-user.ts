import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const BEARER_PREFIX = "bearer ";
const UserIdSchema = z.string().uuid();

export type CurrentUserContext = {
  id: string;
  source: "header" | "authorization" | "legacy_query" | "legacy_params" | "legacy_body";
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

function resolveFromAuthorizationHeader(authorizationHeader: unknown): string | null {
  if (typeof authorizationHeader !== "string") return null;
  const normalized = authorizationHeader.trim();
  if (!normalized || normalized.length <= BEARER_PREFIX.length) return null;
  if (normalized.slice(0, BEARER_PREFIX.length).toLowerCase() !== BEARER_PREFIX) return null;
  return parseUuid(normalized.slice(BEARER_PREFIX.length));
}

function readUserIdKey(input: unknown): string | null {
  if (!input || typeof input !== "object") return null;
  return parseUuid((input as ObjectLike).userId);
}

function resolveFromHeaders(request: FastifyRequest): CurrentUserContext | null {
  const headerUserId = parseUuid(request.headers[CURRENT_USER_HEADER]);
  if (headerUserId) {
    return { id: headerUserId, source: "header" };
  }

  const authorizationUserId = resolveFromAuthorizationHeader(request.headers.authorization);
  if (authorizationUserId) {
    return { id: authorizationUserId, source: "authorization" };
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
    contextual.currentUser = resolveFromHeaders(request);
  });
}

export function resolveCurrentUser(request: FastifyRequest): CurrentUserContext | null {
  const contextual = request as RequestWithCurrentUser;
  if (contextual.currentUser) return contextual.currentUser;
  return resolveFromHeaders(request) ?? resolveLegacyFallback(request);
}

export function requireCurrentUser(request: FastifyRequest, reply: FastifyReply, log?: FastifyBaseLogger): CurrentUserContext | null {
  const resolved = resolveCurrentUser(request);
  if (!resolved) {
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
