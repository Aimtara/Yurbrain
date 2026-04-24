import type { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

export const CURRENT_USER_HEADER = "x-yurbrain-user-id";
const BEARER_PREFIX = "bearer ";
const UserIdSchema = z.string().uuid();

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

function resolveFromHeaders(request: FastifyRequest): CurrentUserContext | null {
  const authorizationUserId = resolveFromAuthorizationHeader(request.headers.authorization);
  if (authorizationUserId) {
    return { id: authorizationUserId, source: "authorization" };
  }

  const headerUserId = parseUuid(request.headers[CURRENT_USER_HEADER]);
  if (headerUserId) {
    return { id: headerUserId, source: "header" };
  }

  return null;
}

export function registerCurrentUserResolution(app: FastifyInstance) {
  app.addHook("onRequest", async (request) => {
    request.currentUser = resolveFromHeaders(request) ?? undefined;
  });
}

export function resolveCurrentUser(request: FastifyRequest): CurrentUserContext | null {
  if (request.currentUser) return request.currentUser;
  const fromHeaders = resolveFromHeaders(request);
  if (fromHeaders) return fromHeaders;
  return null;
}

export function requireCurrentUser(request: FastifyRequest, reply: FastifyReply, log?: FastifyBaseLogger): CurrentUserContext | null {
  const resolved = resolveCurrentUser(request);
  if (!resolved) {
    reply.code(401).send({
      message: "Current user identity is required. Provide Authorization: Bearer <token> or x-yurbrain-user-id header."
    });
    return null;
  }

  request.currentUser = resolved;
  return resolved;
}

export function canAccessUser(currentUser: CurrentUserContext, resourceUserId: string): boolean {
  return currentUser.id === resourceUserId;
}
