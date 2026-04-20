import type { AppState } from "../../state";
import { finishSession, pauseSession, startTaskSession } from "../sessions/lifecycle";

type SessionHelperContext = AppState;

type StartSessionRequest = {
  taskId: string;
};

type TransitionSessionRequest = {
  sessionId: string;
};

export async function startSessionHelper(
  context: SessionHelperContext,
  payload: StartSessionRequest
) {
  const session = await startTaskSession(context, payload.taskId);
  if (!session) {
    throw new Error("Task not found");
  }
  return session;
}

export async function pauseSessionHelper(
  context: SessionHelperContext,
  payload: TransitionSessionRequest
) {
  const session = await pauseSession(context, payload.sessionId);
  if (!session) {
    throw new Error("Session not found or already finished");
  }
  return session;
}

export async function finishSessionHelper(
  context: SessionHelperContext,
  payload: TransitionSessionRequest
) {
  const session = await finishSession(context, payload.sessionId);
  if (!session) {
    throw new Error("Session not found or already finished");
  }
  return session;
}

export async function buildStartSessionResult(
  state: AppState,
  taskId: string
) {
  const session = await startSessionHelper(state, { taskId });
  return { session };
}

export async function buildPauseSessionResult(
  state: AppState,
  sessionId: string
) {
  const session = await pauseSessionHelper(state, { sessionId });
  return { session };
}

export async function buildFinishSessionResult(
  state: AppState,
  sessionId: string
) {
  const session = await finishSessionHelper(state, { sessionId });
  return { session };
}

export async function buildSessionDiagnostics(
  state: AppState,
  sessionId: string
) {
  const session = await state.repo.getSessionById(sessionId);
  if (!session) return null;
  const task = await state.repo.getTaskById(session.taskId);
  return {
    session,
    task,
    suggestion:
      session.state === "paused"
        ? "Resume this session for a short focused block."
        : session.state === "running"
          ? "Keep this session focused on one concrete step."
          : "Session complete; capture one follow-up note if needed."
  };
}
