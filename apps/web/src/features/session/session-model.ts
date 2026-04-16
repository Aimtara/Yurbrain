import type { SessionDto, TaskDto, FeedCardDto, MeInsights } from "../shared/types";

const timeWindowMinutes = {
  "2h": 120,
  "4h": 240,
  "6h": 360,
  "8h": 480,
  "24h": 1440
} as const;

export function selectActiveSession(sessions: SessionDto[]): SessionDto | null {
  if (sessions.length === 0) return null;
  const live = sessions.find((session) => session.state !== "finished");
  return live ?? sessions[0] ?? null;
}

export function resolveTimeWindowMinutes(window: "2h" | "4h" | "6h" | "8h" | "24h" | "custom", customMinutes: number): number {
  if (window === "custom") return Math.max(30, Math.min(1440, Math.trunc(customMinutes)));
  return timeWindowMinutes[window];
}

export function estimateTaskMinutes(task: TaskDto): number {
  const tokenCount = task.title
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const base = 15 + tokenCount * 4;
  const statusAdjustment = task.status === "in_progress" ? 10 : 0;
  return Math.max(15, Math.min(180, base + statusAdjustment));
}

export function deriveSessionElapsedSeconds(session: SessionDto | null): number {
  if (!session) return 0;
  const startValue = new Date(session.startedAt).getTime();
  if (!Number.isFinite(startValue)) return 0;
  const endValue = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
  if (!Number.isFinite(endValue)) return 0;
  return Math.max(0, Math.floor((endValue - startValue) / 1000));
}

export function formatDurationLabel(seconds: number): string {
  const safeSeconds = Math.max(0, Math.trunc(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(minutes, 1)}m`;
}

export function calculatePlannedMinutesForSession(task: TaskDto | null): number {
  if (!task) return 25;
  return estimateTaskMinutes(task);
}

export function summarizeExecutionHint(task: TaskDto | null, session: SessionDto | null): string | undefined {
  if (!task) return undefined;
  if (task.status === "done") return "Task completed.";
  if (task.status === "in_progress") {
    if (session?.state === "running") return "Task in progress with a running session.";
    if (session?.state === "paused") return "Task in progress with a paused session.";
    return "Task in progress.";
  }
  return "Task is queued as the next lightweight step.";
}

export function buildRebalanceSuggestion(deltaMinutes: number): string {
  if (deltaMinutes > 20) {
    return "This took longer than expected. Trim one optional follow-up so your next step stays lightweight.";
  }
  if (deltaMinutes > 0) {
    return "Small overflow is normal. Keep your next step focused and avoid stacking new tasks.";
  }
  if (deltaMinutes < -15) {
    return "You reclaimed time here. Consider using a short block to close one nearby open loop.";
  }
  if (deltaMinutes < 0) {
    return "You finished a little early. Keep that momentum with one tiny continuation step.";
  }
  return "Nice pacing. Keep the same rhythm for your next focused session.";
}

function classifyAccuracyRatio(ratio: number | null): { label: string; detail: string } {
  if (ratio === null) {
    return {
      label: "Not enough finished sessions yet",
      detail: "Complete a couple of focus sessions and this will calibrate your timing pattern."
    };
  }
  if (ratio <= 0.85) {
    return {
      label: "You usually finish faster than planned",
      detail: "Try slightly shorter estimates so your plan mirrors your natural pace."
    };
  }
  if (ratio >= 1.2) {
    return {
      label: "Sessions often run longer than planned",
      detail: "Protect momentum by splitting larger steps before starting."
    };
  }
  return {
    label: "Your estimates are close to reality",
    detail: "Keep using this rhythm. Your planning and execution are aligned."
  };
}

export function buildMeInsights(input: {
  tasks: TaskDto[];
  sessions: SessionDto[];
  feedCards: FeedCardDto[];
}): MeInsights {
  const doneTasks = input.tasks.filter((task) => task.status === "done");
  const todoTasks = input.tasks.filter((task) => task.status === "todo");
  const inProgressTasks = input.tasks.filter((task) => task.status === "in_progress");
  const finishedSessions = input.sessions.filter((session) => session.state === "finished");
  const postponeTotal = input.feedCards.reduce((sum, card) => sum + (card.postponeCount ?? 0), 0);

  const ratios = finishedSessions
    .map((session) => {
      const task = input.tasks.find((candidate) => candidate.id === session.taskId);
      const planned = calculatePlannedMinutesForSession(task ?? null);
      const actual = Math.max(1, Math.floor(deriveSessionElapsedSeconds(session) / 60));
      if (planned <= 0) return null;
      return actual / planned;
    })
    .filter((value): value is number => value !== null);
  const avgRatio = ratios.length > 0 ? ratios.reduce((sum, value) => sum + value, 0) / ratios.length : null;
  const accuracy = classifyAccuracyRatio(avgRatio);

  const carryForwardValue = todoTasks.length + inProgressTasks.length;
  const carryForward =
    carryForwardValue === 0
      ? {
          label: "Carry-forward load is light",
          detail: "You have room to capture new ideas without overloading your next session."
        }
      : carryForwardValue <= 4
        ? {
            label: "Carry-forward is manageable",
            detail: `${carryForwardValue} open tasks are waiting. Pick one and keep the next move tiny.`
          }
        : {
            label: "Carry-forward is building",
            detail: `${carryForwardValue} open tasks are stacked. A short rebalance can reduce context switching.`
          };

  const postponement =
    postponeTotal === 0
      ? {
          label: "You are not leaning on postpones right now",
          detail: "Great signal for momentum. Keep protecting focus windows."
        }
      : postponeTotal <= 5
        ? {
            label: "Some postponing, still healthy",
            detail: `${postponeTotal} postpones recorded. Consider breaking one delayed card into a smaller next step.`
          }
        : {
            label: "Postponement pattern is rising",
            detail: `${postponeTotal} postpones recorded. A reset on scope may help you regain flow.`
          };

  const topInsight =
    carryForwardValue > 4
      ? "Most friction is coming from carry-forward load, not lack of effort."
      : postponeTotal > 5
        ? "Postpones are signaling scope pressure; shrinking the next step should help."
        : doneTasks.length > 0
          ? "Completion momentum is visible. Protect it with one clearly scoped next action."
          : "Start with one tiny completed session to establish momentum.";

  const recommendation =
    carryForwardValue > 4
      ? "Choose one in-progress task, postpone one non-urgent card, and run a 20-minute session."
      : postponeTotal > 5
        ? "Use 'Break into smaller step' on your next delayed card, then finish that smaller step today."
        : avgRatio !== null && avgRatio >= 1.2
          ? "Trim your next estimate and finish one shorter session before adding new work."
          : "Keep your current rhythm and close one more lightweight loop before context switching.";

  return {
    topInsight,
    estimationAccuracy: accuracy,
    carryForward,
    postponement,
    recommendation
  };
}
