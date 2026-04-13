import React from "react";

type ActiveSessionScreenProps = {
  state: "running" | "paused" | "finished" | string;
  onPause?: () => void;
  onFinish?: () => void;
};

export function ActiveSessionScreen({ state, onPause, onFinish }: ActiveSessionScreenProps) {
  return (
    <section aria-label="Active session screen">
      <p>Session: {state}</p>
      <div>
        <button type="button" onClick={onPause} disabled={!onPause || state !== "running"}>
          Pause
        </button>
        <button type="button" onClick={onFinish} disabled={!onFinish || state === "finished"}>
          Finish
        </button>
      </div>
    </section>
  );
}
