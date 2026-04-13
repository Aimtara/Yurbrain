"use client";

import { useState } from "react";
import { BrainItemScreen, CaptureComposer, FeedCard, FeedLensBar } from "@yurbrain/ui";

export default function Page() {
  const [activeLens, setActiveLens] = useState("all");
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<string[]>([
    "Bring this up in planning.",
    "Need a concrete owner and due date."
  ]);
  const [lastAction, setLastAction] = useState("none");

  return (
    <main>
      <h1>Yurbrain Web</h1>
      <FeedLensBar lenses={["all", "keep_in_mind", "open_loops"]} activeLens={activeLens} onChange={setActiveLens} />
      <FeedCard title="Sprint starter ready" body={`Current lens: ${activeLens}`} />
      <CaptureComposer value={draft} onChange={setDraft} onSubmit={() => setDraft("")} />

      <hr />

      <BrainItemScreen
        item={{
          id: "demo-item-1",
          title: "Founder call notes",
          rawContent:
            "Investigate onboarding drop-off and synthesize options for reducing first-session friction this week."
        }}
        comments={comments}
        onQuickAction={(action) => setLastAction(action)}
        onAddComment={(comment) => setComments((current) => [comment, ...current])}
      />
      <p>Last quick action: {lastAction}</p>
    </main>
  );
}
