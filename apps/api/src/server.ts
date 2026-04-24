import Fastify from "fastify";
import { ZodError } from "zod";
import { AuthMeResponseSchema } from "@yurbrain/contracts";
import { registerCurrentUserResolution, requireCurrentUser } from "./middleware/current-user";
import { registerObservability, sendSafeErrorResponse } from "./middleware/observability";
import { registerBrainItemRoutes } from "./routes/brain-items";
import { registerCaptureRoutes } from "./routes/capture";
import { registerFunctionRoutes } from "./routes/functions";
import { registerFeedRoutes } from "./routes/feed";
import { registerMessageRoutes } from "./routes/messages";
import { registerPreferenceRoutes } from "./routes/preferences";
import { registerSessionRoutes } from "./routes/sessions";
import { registerTaskRoutes } from "./routes/tasks";
import { registerThreadRoutes } from "./routes/threads";
import { createState } from "./state";

type ServerOptions = {
  databasePath?: string;
  migrationsPath?: string;
};

type DeploymentEnvironment = "local" | "preview" | "staging" | "production";

type CorsResolution =
  | {
      allowed: true;
      allowOrigin: string;
      allowCredentials: true;
    }
  | {
      allowed: false;
      reason: "missing_origin" | "origin_not_allowed";
      allowCredentials: false;
    };

const LOCAL_ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(?::\d+)?$/i,
  /^https?:\/\/127\.0\.0\.1(?::\d+)?$/i,
  /^https?:\/\/\[::1\](?::\d+)?$/i,
  /^exp:\/\//i
];

function trimValue(raw: string | undefined): string | undefined {
  if (typeof raw !== "string") return undefined;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function resolveDeploymentEnvironment(): DeploymentEnvironment {
  const configuredEnvironment = trimValue(process.env.NHOST_PROJECT_ENV)?.toLowerCase();
  if (
    configuredEnvironment === "local" ||
    configuredEnvironment === "preview" ||
    configuredEnvironment === "staging" ||
    configuredEnvironment === "production"
  ) {
    return configuredEnvironment;
  }

  if (process.env.NODE_ENV === "production") {
    return "production";
  }

  return "local";
}

function readConfiguredAllowedOrigins(): string[] {
  const configuredOrigins =
    trimValue(process.env.API_ALLOWED_ORIGINS) ??
    trimValue(process.env.YURBRAIN_ALLOWED_ORIGINS);
  return parseCsv(configuredOrigins);
}

function isStrictCorsEnvironment(environment: DeploymentEnvironment): boolean {
  return environment === "preview" || environment === "staging" || environment === "production";
}

function isLocalDevelopmentOrigin(requestOrigin: string): boolean {
  return LOCAL_ALLOWED_ORIGIN_PATTERNS.some((pattern) => pattern.test(requestOrigin));
}

function resolveCorsPolicy(
  requestOrigin: string,
  environment: DeploymentEnvironment,
  configuredAllowedOrigins: string[]
): CorsResolution {
  if (!requestOrigin) {
    return {
      allowed: false,
      reason: "missing_origin",
      allowCredentials: false
    };
  }

  if (configuredAllowedOrigins.includes(requestOrigin)) {
    return {
      allowed: true,
      allowOrigin: requestOrigin,
      allowCredentials: true
    };
  }

  if (!isStrictCorsEnvironment(environment) && isLocalDevelopmentOrigin(requestOrigin)) {
    return {
      allowed: true,
      allowOrigin: requestOrigin,
      allowCredentials: true
    };
  }

  return {
    allowed: false,
    reason: "origin_not_allowed",
    allowCredentials: false
  };
}

export function createServer(options: ServerOptions = {}) {
  const isTestEnvironment = process.env.NODE_ENV === "test";
  const deploymentEnvironment = resolveDeploymentEnvironment();
  const configuredAllowedOrigins = readConfiguredAllowedOrigins();
  const state = createState(options);
  const app = Fastify({
    logger: isTestEnvironment
      ? false
      : {
          redact: {
            paths: [
              "req.headers.authorization",
              "req.headers.cookie",
              "req.headers.x-hasura-admin-secret",
              "req.headers.x-api-key",
              "req.body.password",
              "req.body.token",
              "req.body.accessToken",
              "req.body.refreshToken",
              "req.body.adminSecret",
              "req.body.rawContent",
              "req.body.content"
            ],
            censor: "[REDACTED]"
          }
        }
  });
  registerObservability(app);
  registerCurrentUserResolution(app);

  app.addHook("onRequest", async (request, reply) => {
    const requestOrigin = typeof request.headers.origin === "string" ? request.headers.origin : "";
    const corsResolution = resolveCorsPolicy(
      requestOrigin,
      deploymentEnvironment,
      configuredAllowedOrigins
    );

    if (!corsResolution.allowed && corsResolution.reason === "origin_not_allowed") {
      request.log.warn(
        {
          event: "cors_origin_rejected",
          origin: requestOrigin,
          environment: deploymentEnvironment,
          configuredOriginCount: configuredAllowedOrigins.length
        },
        "cors_origin_rejected"
      );
      return sendSafeErrorResponse(request, reply, {
        statusCode: 403,
        message: "Origin not allowed.",
        code: "ORIGIN_NOT_ALLOWED"
      });
    }

    if (corsResolution.allowed) {
      reply.header("Access-Control-Allow-Origin", corsResolution.allowOrigin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Vary", "Origin");
    }

    reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id, X-Yurbrain-User-Id");

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
      return sendSafeErrorResponse(request, reply, {
        statusCode: 400,
        message: "Validation failed",
        details: issues,
        code: "VALIDATION_FAILED",
        extra: { issues }
      });
    }

    const errorName = error instanceof Error ? error.name : "UnknownError";
    app.log.error(
      {
        event: "unhandled_error",
        requestId: request.id,
        errorName
      },
      "unhandled_error"
    );
    return sendSafeErrorResponse(request, reply, {
      statusCode: 500,
      message: "Internal server error",
      code: "INTERNAL_SERVER_ERROR"
    });
  });

  registerBrainItemRoutes(app, state);
  registerCaptureRoutes(app, state);
  registerThreadRoutes(app, state);
  registerMessageRoutes(app, state);
  registerPreferenceRoutes(app, state);
  registerFeedRoutes(app, state);
  registerTaskRoutes(app, state);
  registerSessionRoutes(app, state);
  registerFunctionRoutes(app, state);

  app.get("/auth/me", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    return reply.code(200).send(AuthMeResponseSchema.parse({
      id: currentUser.id,
      source: currentUser.source
    }));
  });

  app.get("/events", async (_request, reply) => {
    return sendSafeErrorResponse(_request, reply, {
      statusCode: 403,
      message: "The /events endpoint is disabled until authentication and per-user event filtering are implemented",
      code: "FEATURE_DISABLED"
    });
  });

  app.addHook("onClose", async () => {
    await state.repo.close();
  });

  return { app, state };
}

const server = createServer();
const { app, state } = server;

export { app, state, resolveCorsPolicy };
