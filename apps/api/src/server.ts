import Fastify from "fastify";
import { ZodError } from "zod";
import { registerObservability } from "./middleware/observability";
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
  if (error instanceof ZodError) {
    return reply.code(400).send({
      message: "Validation failed",
      requestId: request.requestId,
      issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    });
  }

  app.log.error({ err: error, requestId: request.requestId }, "unhandled_error");
  return reply.code(500).send({ message: "Internal server error", requestId: request.requestId });
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
