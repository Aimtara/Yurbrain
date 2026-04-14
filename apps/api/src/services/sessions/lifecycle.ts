import { randomUUID } from "node:crypto";

import type { AppState, SessionRecord } from "../../state";

export async function startTaskSession(state: AppState, taskId: string): Promise<SessionRecord | null> {
  const task = await state.repo.getTaskById(taskId);
  if (!task) {
    return null;
  }

  const activeSession = await state.repo.findActiveSessionByTaskId(taskId);
  if (activeSession) {
    return activeSession;
  }

  const now = new Date().toISOString();
  const session: SessionRecord = {
    id: randomUUID(),
    taskId,
    state: "running",
    startedAt: now,
    endedAt: null
  };

  await state.repo.updateTask(taskId, { status: "in_progress", updatedAt: now });
  await state.repo.createSession(session);
  return session;
}

export async function pauseSession(state: AppState, sessionId: string): Promise<SessionRecord | null> {
  const session = await state.repo.getSessionById(sessionId);
  if (!session || session.state === "finished") {
    return null;
  }

  return state.repo.updateSession(session.id, { state: "paused" });
}

export async function finishSession(state: AppState, sessionId: string): Promise<SessionRecord | null> {
  const session = await state.repo.getSessionById(sessionId);
  if (!session || session.state === "finished") {
    return null;
  }

  const now = new Date().toISOString();
  const updatedSession = await state.repo.updateSession(session.id, { state: "finished", endedAt: now });
  const task = await state.repo.getTaskById(session.taskId);
  if (task) {
    await state.repo.updateTask(task.id, { status: "done", updatedAt: now });
  }

  return updatedSession;
}
