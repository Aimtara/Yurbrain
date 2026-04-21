import type { FastifyInstance } from "fastify";
import { ListSessionsQuerySchema, SessionListResponseSchema, SessionResponseSchema } from "@yurbrain/contracts";
import { canAccessUser, requireCurrentUser } from "../middleware/current-user";
import { finishSession, pauseSession, startTaskSession } from "../services/sessions/lifecycle";
import type { AppState } from "../state";

function toSessionResponsePayload(session: {
  id: string;
  taskId: string;
  state: "running" | "paused" | "finished";
  startedAt: string;
  endedAt: string | null;
}) {
  return {
    id: session.id,
    taskId: session.taskId,
    state: session.state,
    startedAt: session.startedAt,
    endedAt: session.endedAt
  };
}

export async function registerSessionRoutes(app: FastifyInstance, state: AppState) {
  app.get("/sessions", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const query = ListSessionsQuerySchema.parse({ ...(request.query as Record<string, unknown> | undefined), userId: currentUser.id });
    const sessions = await state.repo.listSessions({ ...query, userId: currentUser.id });
    return reply.code(200).send(SessionListResponseSchema.parse(sessions));
  });

  app.post("/tasks/:id/start", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const task = await state.repo.getTaskById(id);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Task not found" });
    }
    const session = await startTaskSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Task not found" });
    }

    return reply.code(201).send(SessionResponseSchema.parse(toSessionResponsePayload(session)));
  });

  app.post("/sessions/:id/pause", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const existingSession = await state.repo.getSessionById(id);
    if (!existingSession) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    const task = await state.repo.getTaskById(existingSession.taskId);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    const session = await pauseSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }

    return reply.code(200).send(SessionResponseSchema.parse(toSessionResponsePayload(session)));
  });

  app.post("/sessions/:id/finish", async (request, reply) => {
    const currentUser = requireCurrentUser(request, reply, request.log);
    if (!currentUser) return;
    const { id } = request.params as { id: string };
    const existingSession = await state.repo.getSessionById(id);
    if (!existingSession) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    const task = await state.repo.getTaskById(existingSession.taskId);
    if (!task || !canAccessUser(currentUser, task.userId)) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }
    const session = await finishSession(state, id);

    if (!session) {
      return reply.code(404).send({ message: "Session not found or already finished" });
    }

    return reply.code(200).send(SessionResponseSchema.parse(toSessionResponsePayload(session)));
  });
}
