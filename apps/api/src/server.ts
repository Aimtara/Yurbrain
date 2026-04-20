import Fastify from "fastify";
import { ZodError } from "zod";
import { AuthMeResponseSchema } from "@yurbrain/contracts";
import { registerCurrentUserResolution, requireCurrentUser } from "./middleware/current-user";
import { registerObservability, buildErrorEnvelope } from "./middleware/observability";
import { registerAiRoutes } from "./routes/ai";
import { registerBrainItemRoutes } from "./routes/brain-items";
import { registerCaptureRoutes } from "./routes/capture";
import { registerConvertRoutes } from "./routes/convert";
import { registerFunctionRoutes } from "./routes/functions";
import { registerFeedRoutes } from "./routes/feed";
import { registerFounderReviewRoutes } from "./routes/founder-review";
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
  const app = Fastify({ logger: !isTestEnvironment });
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
    const requestIdHeader = (request.headers["x-request-id"] as string | undefined)?.trim() || request.id;
    reply.header("x-request-id", requestIdHeader);

    if (error instanceof ZodError) {
      const issues = error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
      const envelope = buildErrorEnvelope(request, 400, "Validation failed", issues);
      return reply.code(400).send({
        ...envelope,
        message: "Validation failed",
        requestId: requestIdHeader,
        issues
      });
    }

    app.log.error({ err: error, requestId: request.id }, "unhandled_error");
    const envelope = buildErrorEnvelope(request, 500, "Internal server error");
    return reply.code(500).send({ ...envelope, message: "Internal server error", requestId: requestIdHeader });
  });

  registerBrainItemRoutes(app, state);
  registerCaptureRoutes(app, state);
  registerThreadRoutes(app, state);
  registerMessageRoutes(app, state);
  registerPreferenceRoutes(app, state);
  registerFeedRoutes(app, state);
  registerFounderReviewRoutes(app, state);
  registerTaskRoutes(app, state);
  registerSessionRoutes(app, state);
  registerAiRoutes(app, state);
  registerConvertRoutes(app, state);
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
    return reply.code(403).send({
      message: "The /events endpoint is disabled until authentication and per-user event filtering are implemented"
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
