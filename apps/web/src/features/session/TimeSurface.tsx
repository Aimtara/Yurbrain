import { TimeWindowSelector, type TimeWindowOption } from "@yurbrain/ui";

import type { TaskDto } from "../shared/types";

type TimeSurfaceProps = {
  timeWindow: TimeWindowOption;
  customWindowMinutes: number;
  tasksLoading: boolean;
  timeWindowLabel: string;
  windowMinutes: number;
  resumeSessionCard: { taskId: string; title: string; state: "running" | "paused" } | null;
  timeSuggestedTasks: { tasks: Array<{ task: TaskDto; minutes: number }> };
  timeActionNotice: string;
  taskError: string;
  onBackToFeed: () => void;
  onWindowChange: (window: TimeWindowOption) => void;
  onCustomMinutesChange: (minutes: number) => void;
  onStartTimeTask: (taskId: string) => void;
  onStartWithoutPlanning: () => void;
};

export function TimeSurface({
  timeWindow,
  customWindowMinutes,
  tasksLoading,
  timeWindowLabel,
  windowMinutes,
  resumeSessionCard,
  timeSuggestedTasks,
  timeActionNotice,
  taskError,
  onBackToFeed,
  onWindowChange,
  onCustomMinutesChange,
  onStartTimeTask,
  onStartWithoutPlanning
}: TimeSurfaceProps) {
  return (
    <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Time home</h2>
            <p style={{ margin: "6px 0 0", color: "#475569" }}>Choose a horizon, then start one task that fits.</p>
          </div>
          <button type="button" onClick={onBackToFeed}>
            Back to Focus Feed
          </button>
        </div>

        <TimeWindowSelector
          activeWindow={timeWindow}
          customMinutes={customWindowMinutes}
          onWindowChange={onWindowChange}
          onCustomMinutesChange={onCustomMinutesChange}
          disabled={tasksLoading}
        />

        <div style={{ borderRadius: "14px", border: "1px solid #e2e8f0", background: "#f8fafc", padding: "12px" }}>
          <p style={{ margin: 0 }}>
            <strong>Window:</strong> {timeWindowLabel} ({windowMinutes} minutes)
          </p>
          <p style={{ margin: "6px 0 0", color: "#475569" }}>Suggested tasks are deterministic and based on task title length plus status.</p>
        </div>

        {resumeSessionCard ? (
          <div style={{ borderRadius: "14px", border: "1px solid #bfdbfe", background: "#eff6ff", padding: "12px", display: "grid", gap: "8px" }}>
            <p style={{ margin: 0 }}>
              <strong>Resume in progress:</strong> {resumeSessionCard.title}
            </p>
            <p style={{ margin: 0, color: "#334155" }}>
              {resumeSessionCard.state === "running" ? "Session is running now." : "Session is paused and ready to resume."}
            </p>
            <div>
              <button type="button" onClick={() => onStartTimeTask(resumeSessionCard.taskId)} disabled={tasksLoading}>
                Resume task
              </button>
            </div>
          </div>
        ) : null}

        <div style={{ display: "grid", gap: "10px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", lineHeight: "24px" }}>Tasks that fit {timeWindowLabel}</h3>
          {timeSuggestedTasks.tasks.length === 0 ? (
            <p style={{ margin: 0, color: "#475569" }}>No queued tasks fit yet. Capture or convert one item, then return here.</p>
          ) : (
            timeSuggestedTasks.tasks.map((entry) => (
              <div
                key={entry.task.id}
                style={{
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap"
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{entry.task.title}</p>
                  <p style={{ margin: "4px 0 0", color: "#475569" }}>
                    Estimated {entry.minutes} minutes · status {entry.task.status}
                  </p>
                </div>
                <button type="button" onClick={() => onStartTimeTask(entry.task.id)} disabled={tasksLoading}>
                  Start
                </button>
              </div>
            ))
          )}
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onStartWithoutPlanning}
            disabled={tasksLoading}
            style={{ background: "#0f172a", color: "#ffffff", border: "1px solid #0f172a", borderRadius: "10px", padding: "8px 12px" }}
          >
            Start without planning
          </button>
        </div>
        {timeActionNotice ? <p style={{ margin: 0 }}>{timeActionNotice}</p> : null}
        {taskError ? <p style={{ margin: 0 }}>{taskError}</p> : null}
      </div>
    </section>
  );
}
