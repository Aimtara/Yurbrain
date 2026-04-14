import type { FastifyInstance } from "fastify";
import { ListSessionsQuerySchema, SessionListResponseSchema, SessionResponseSchema } from "../../../../packages/contracts/src";
import { finishSession, pauseSession, startTaskSession } from "../services/sessions/lifecycle";
import type { AppState } from "../state";

export async function registerSessionRoutes(app: FastifyInstance, state: AppState) {
  app.get("/sessions", async (request, reply) => {
    const query = ListSessionsQuerySchema.parse(request.query ?? {});
    const sessions = await state.repo.listSessions(query);
    return reply.code(200).send(SessionListResponseSchema.parse(sessions));
  });

  app.post("/tasks/:id/start", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await startTaskSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Task not found" });
    }

    return reply.code(201).send(SessionResponseSchema.parse(session));
  });

  app.post("/sessions/:id/pause", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await pauseSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }

    return reply.code(200).send(SessionResponseSchema.parse(session));
  });

  app.post("/sessions/:id/finish", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = await finishSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }

    return reply.code(200).send(SessionResponseSchema.parse(session));
  });
}
