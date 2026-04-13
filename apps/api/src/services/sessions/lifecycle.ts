import { randomUUID } from "node:crypto";

import type { AppState, SessionRecord } from "../../state";

export function startTaskSession(state: AppState, taskId: string): SessionRecord | null {
  const task = state.tasks.get(taskId);
  if (!task) {
    return null;
  }

  const activeSession = Array.from(state.sessions.values()).find((session) => session.taskId === taskId && session.state !== "finished");
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

  task.status = "in_progress";
  task.updatedAt = now;
  state.tasks.set(taskId, task);
  state.sessions.set(session.id, session);
  return session;
}

export function pauseSession(state: AppState, sessionId: string): SessionRecord | null {
  const session = state.sessions.get(sessionId);
  if (!session || session.state === "finished") {
    return null;
  }

  session.state = "paused";
  state.sessions.set(session.id, session);
  return session;
}

export function finishSession(state: AppState, sessionId: string): SessionRecord | null {
  const session = state.sessions.get(sessionId);
  if (!session || session.state === "finished") {
    return null;
  }

  const now = new Date().toISOString();
  session.state = "finished";
  session.endedAt = now;
  state.sessions.set(session.id, session);

  const task = state.tasks.get(session.taskId);
  if (task) {
    task.status = "done";
    task.updatedAt = now;
    state.tasks.set(task.id, task);
  }

  return session;
}
