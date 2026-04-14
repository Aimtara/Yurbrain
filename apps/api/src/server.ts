import Fastify from "fastify";
import { ZodError } from "zod";
import { registerObservability, buildErrorEnvelope } from "./middleware/observability";
import { registerAiRoutes } from "./routes/ai";
import { registerBrainItemRoutes } from "./routes/brain-items";
import { registerConvertRoutes } from "./routes/convert";
import { registerFeedRoutes } from "./routes/feed";
import { registerMessageRoutes } from "./routes/messages";
import { registerSessionRoutes } from "./routes/sessions";
import { registerTaskRoutes } from "./routes/tasks";
import { registerThreadRoutes } from "./routes/threads";
import { createState } from "./state";

const state = createState();
const app = Fastify({ logger: true });
registerObservability(app);

app.setErrorHandler((error, request, reply) => {
  const requestIdHeader = (request.headers["x-request-id"] as string | undefined)?.trim() || request.requestId;
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

  app.log.error({ err: error, requestId: request.requestId }, "unhandled_error");
  const envelope = buildErrorEnvelope(request, 500, "Internal server error");
  return reply.code(500).send({ ...envelope, message: "Internal server error", requestId: requestIdHeader });
});

registerBrainItemRoutes(app, state);
registerThreadRoutes(app, state);
registerMessageRoutes(app, state);
registerFeedRoutes(app, state);
registerTaskRoutes(app, state);
registerSessionRoutes(app, state);
registerAiRoutes(app, state);
registerConvertRoutes(app, state);

app.get("/events", async (_request, reply) => {
  return reply.code(403).send({
    message: "The /events endpoint is disabled until authentication and per-user event filtering are implemented"
  });
});

export { app, state };
