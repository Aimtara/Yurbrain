"use client";

import { useEffect, useState } from "react";
import { getFeed } from "@yurbrain/client";
import { BrainItemScreen, CaptureComposer, FeedCard, FeedLensBar, ItemChatPanel } from "@yurbrain/ui";

type FeedCardDto = { id: string; title: string; body: string };

export default function Page() {
  const [activeLens, setActiveLens] = useState("all");
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<string[]>(["Welcome to the thread."]);
  const [lastAction, setLastAction] = useState("none");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);

  useEffect(() => {
    getFeed<FeedCardDto[]>()
      .then((cards) => setFeedCards(cards))
      .catch(() => setFeedCards([{ id: "fallback", title: "No feed yet", body: "Generate cards from the API." }]));
  }, []);

  return (
    <main>
      <h1>Yurbrain Web</h1>
      <FeedLensBar lenses={["all", "keep_in_mind", "open_loops"]} activeLens={activeLens} onChange={setActiveLens} />
      {feedCards.map((card) => (
        <FeedCard
          key={card.id}
          title={card.title}
          body={card.body}
          onComment={(comment) => setComments((current) => [comment, ...current])}
          onConvertToTask={() => setLastAction("convert_to_task")}
        />
      ))}
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
      <ItemChatPanel onSend={(message) => setChatMessages((current) => [...current, message])} messages={chatMessages} />
      <p>Last quick action: {lastAction}</p>
    </main>
  );
}
