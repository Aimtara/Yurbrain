import { ActiveSessionScreen, TaskDetailCard } from "@yurbrain/ui";

import type { TaskDto, SessionDto } from "../shared/types";

type SessionSurfaceProps = {
  selectedTask: TaskDto | null;
  selectedTaskSession: SessionDto | null;
  contextPeek: { title: string; content: string; hint: string } | null;
  onBackToFeed: () => void;
  onStartTaskSession: () => void;
  onMarkTaskDone: () => void;
  onPauseSession: () => void;
  onFinishSession: () => void;
  onOpenSourceItem: () => void;
};

export function SessionSurface({
  selectedTask,
  selectedTaskSession,
  contextPeek,
  onBackToFeed,
  onStartTaskSession,
  onMarkTaskDone,
  onPauseSession,
  onFinishSession,
  onOpenSourceItem
}: SessionSurfaceProps) {
  return (
    <section style={{ margin: "24px auto 0", maxWidth: "960px", padding: "0 16px", display: "grid", gap: "16px" }}>
      <div style={{ borderRadius: "20px", border: "1px solid #e2e8f0", background: "#ffffff", padding: "16px", display: "grid", gap: "12px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <h2 style={{ margin: 0, fontSize: "22px", lineHeight: "28px" }}>Execution session</h2>
          <button type="button" onClick={onBackToFeed}>
            Back to Focus Feed
          </button>
        </div>
        {!selectedTask ? <p style={{ margin: 0 }}>Pick a task from a feed card to start a session.</p> : null}
        {selectedTask ? <TaskDetailCard title={selectedTask.title} status={selectedTask.status} onStart={onStartTaskSession} onMarkDone={onMarkTaskDone} /> : null}
      </div>
      {selectedTask && selectedTaskSession ? (
        <ActiveSessionScreen
          taskTitle={selectedTask.title}
          state={selectedTaskSession.state}
          startedAt={selectedTaskSession.startedAt}
          endedAt={selectedTaskSession.endedAt}
          contextPeek={contextPeek}
          onPause={onPauseSession}
          onFinish={onFinishSession}
          onOpenSource={onOpenSourceItem}
          onReturnToFeed={onBackToFeed}
        />
      ) : (
        <div style={{ borderRadius: "20px", border: "1px dashed #94a3b8", background: "#ffffff", padding: "20px" }}>
          <p style={{ margin: 0 }}>No active session yet. Start one from the task card when you are ready.</p>
        </div>
      )}
    </section>
  );
}
