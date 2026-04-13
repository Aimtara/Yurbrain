"use client";

import { useState } from "react";
import { CaptureComposer, FeedCard, FeedLensBar } from "@yurbrain/ui";

export default function Page() {
  const [activeLens, setActiveLens] = useState("all");
  const [draft, setDraft] = useState("");

  return (
    <main>
      <h1>Yurbrain Web</h1>
      <FeedLensBar lenses={["all", "keep_in_mind", "open_loops"]} activeLens={activeLens} onChange={setActiveLens} />
      <FeedCard title="Sprint starter ready" body={`Current lens: ${activeLens}`} />
      <CaptureComposer value={draft} onChange={setDraft} onSubmit={() => setDraft("")} />
    </main>
  );
}
