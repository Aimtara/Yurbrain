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

export function createServer(options: ServerOptions = {}) {
  const isTestEnvironment = process.env.NODE_ENV === "test";
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
    const allowOrigin = resolveAllowedOrigin(requestOrigin);

    reply.header("Access-Control-Allow-Origin", allowOrigin);
    reply.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Request-Id, X-Yurbrain-User-Id");
    reply.header("Access-Control-Allow-Credentials", "true");

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

    app.log.error(
      {
        event: "unhandled_error",
        requestId: request.id,
        errorName: error.name
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

function resolveAllowedOrigin(requestOrigin: string): string {
  if (!requestOrigin) return "*";
  if (requestOrigin.startsWith("http://localhost:")) return requestOrigin;
  if (requestOrigin.startsWith("http://127.0.0.1:")) return requestOrigin;
  if (requestOrigin.startsWith("exp://")) return requestOrigin;
  return "*";
}

const server = createServer();
const { app, state } = server;

export { app, state };
