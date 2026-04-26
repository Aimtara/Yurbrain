import type { FastifyInstance, FastifyRequest } from "fastify";
import { sanitizeUrlForLogging, sendSafeErrorResponse } from "./observability";

export type RateLimitClass =
  | "read_standard"
  | "write_standard"
  | "feed"
  | "ai_expensive"
  | "storage_write"
  | "auth_sensitive"
  | "diagnostics_sensitive";

export type RateLimitConfig = {
  enabled: boolean;
  windowMs: number;
  limits: Record<RateLimitClass, number>;
};

export type RateLimitOptions = Partial<RateLimitConfig> & {
  limits?: Partial<Record<RateLimitClass, number>>;
};

type RateBucket = {
  count: number;
  resetAt: number;
};

const DEFAULT_LIMITS: Record<RateLimitClass, number> = {
  read_standard: 600,
  write_standard: 120,
  feed: 120,
  ai_expensive: 60,
  storage_write: 30,
  auth_sensitive: 60,
  diagnostics_sensitive: 20
};

const DEFAULT_WINDOW_MS = 60_000;

const buckets = new Map<string, RateBucket>();

function trimValue(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseBoolean(raw: string | undefined): boolean | undefined {
  const normalized = trimValue(raw)?.toLowerCase();
  if (!normalized) return undefined;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return undefined;
}

function parsePositiveInteger(raw: string | undefined): number | undefined {
  const normalized = trimValue(raw);
  if (!normalized) return undefined;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed;
}

function isProductionLikeEnvironment(): boolean {
  const projectEnv = trimValue(process.env.NHOST_PROJECT_ENV)?.toLowerCase();
  return projectEnv === "preview" || projectEnv === "staging" || projectEnv === "production" || process.env.NODE_ENV === "production";
}

function readLimitOverride(rateClass: RateLimitClass): number | undefined {
  const key = `YURBRAIN_RATE_LIMIT_${rateClass.toUpperCase()}_LIMIT`;
  const legacyKey = `YURBRAIN_RATE_LIMIT_${rateClass.toUpperCase()}`;
  return parsePositiveInteger(process.env[key]) ?? parsePositiveInteger(process.env[legacyKey]);
}

export function resolveRateLimitConfig(options: RateLimitOptions = {}): RateLimitConfig {
  const productionLike = isProductionLikeEnvironment();
  const disabledByEnv = parseBoolean(process.env.YURBRAIN_RATE_LIMIT_DISABLED) === true;
  const enabled = productionLike ? true : options.enabled ?? !disabledByEnv;
  const windowMs =
    options.windowMs ??
    parsePositiveInteger(process.env.YURBRAIN_RATE_LIMIT_WINDOW_MS) ??
    DEFAULT_WINDOW_MS;

  const limits = { ...DEFAULT_LIMITS };
  for (const rateClass of Object.keys(DEFAULT_LIMITS) as RateLimitClass[]) {
    limits[rateClass] = options.limits?.[rateClass] ?? readLimitOverride(rateClass) ?? limits[rateClass];
  }

  return {
    enabled,
    windowMs,
    limits
  };
}

export function resetRateLimitBucketsForTests() {
  buckets.clear();
}

function routeClassForRequest(request: FastifyRequest): RateLimitClass {
  const method = request.method.toUpperCase();
  const path = sanitizeUrlForLogging(request.url);

  if (path === "/auth/me" || path.startsWith("/auth/")) return "auth_sensitive";
  if (path.includes("/founder-review")) return "diagnostics_sensitive";
  if (path.startsWith("/attachments") || path.startsWith("/storage")) return "storage_write";
  if (path.startsWith("/ai/")) return "ai_expensive";
  if (
    path === "/functions/summarize" ||
    path === "/functions/classify" ||
    path === "/functions/query" ||
    path === "/functions/convert" ||
    path === "/functions/summarize-progress" ||
    path === "/functions/what-should-i-do-next"
  ) {
    return "ai_expensive";
  }
  if (path === "/feed" || path.startsWith("/feed/") || path === "/functions/feed" || path.startsWith("/functions/feed/")) {
    return "feed";
  }
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return "read_standard";
  return "write_standard";
}

function normalizeRouteForKey(request: FastifyRequest): string {
  return sanitizeUrlForLogging(request.url).replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi,
    ":id"
  );
}

function resolvePrincipalForRateLimit(request: FastifyRequest): string {
  if (request.currentUser?.id) {
    return `user:${request.currentUser.id}`;
  }
  const forwardedFor = request.headers["x-forwarded-for"];
  const forwardedIp =
    typeof forwardedFor === "string" && forwardedFor.trim().length > 0
      ? forwardedFor.split(",")[0]?.trim()
      : undefined;
  return `ip:${forwardedIp || request.ip || "unknown"}`;
}

export function registerRateLimiting(app: FastifyInstance, options: RateLimitOptions = {}) {
  app.addHook("onRequest", async (request, reply) => {
    const config = resolveRateLimitConfig(options);
    if (!config.enabled) return;
    if (request.method.toUpperCase() === "OPTIONS") return;

    const rateClass = routeClassForRequest(request);
    const limit = config.limits[rateClass];
    const now = Date.now();
    const key = `${rateClass}:${request.method.toUpperCase()}:${normalizeRouteForKey(request)}:${resolvePrincipalForRateLimit(request)}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + config.windowMs } : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    const remaining = Math.max(0, limit - bucket.count);
    reply.header("x-yurbrain-rate-limit-class", rateClass);
    reply.header("x-yurbrain-rate-limit-limit", String(limit));
    reply.header("x-yurbrain-rate-limit-remaining", String(remaining));
    reply.header("x-yurbrain-rate-limit-reset-ms", String(Math.max(0, bucket.resetAt - now)));

    if (bucket.count <= limit) return;

    request.log.warn(
      {
        event: "rate_limit_exceeded",
        rateClass,
        route: normalizeRouteForKey(request),
        principalKind: request.currentUser?.id ? "user" : "ip"
      },
      "rate limit exceeded"
    );
    return sendSafeErrorResponse(request, reply, {
      statusCode: 429,
      message: "Too many requests. Please slow down and try again shortly.",
      code: "RATE_LIMITED",
      extra: {
        rateLimit: {
          class: rateClass,
          limit,
          remaining: 0,
          resetMs: Math.max(0, bucket.resetAt - now)
        }
      }
    });
  });
}
