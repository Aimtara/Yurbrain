"use client";

import { useEffect, useState } from "react";
import {
  classifyBrainItem,
  createThread,
  dismissFeedCard,
  getFeed,
  queryBrainItemThread,
  refreshFeedCard,
  snoozeFeedCard,
  summarizeBrainItem
} from "@yurbrain/client";
import { BrainItemScreen, CaptureComposer, FeedCard, FeedLensBar, ItemChatPanel, type FeedLens } from "@yurbrain/ui";

type FeedCardDto = { id: string; title: string; body: string };
const userId = "11111111-1111-1111-1111-111111111111";

export default function Page() {
  const [activeLens, setActiveLens] = useState<FeedLens>("all");
  const [draft, setDraft] = useState("");
  const [comments, setComments] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<string[]>(["Welcome to the thread."]);
  const [summary, setSummary] = useState("");
  const [classification, setClassification] = useState("");
  const [chatFallbackNotice, setChatFallbackNotice] = useState("");
  const [lastAction, setLastAction] = useState("none");
  const [feedCards, setFeedCards] = useState<FeedCardDto[]>([]);
  const [feedError, setFeedError] = useState("");
  const [threadId, setThreadId] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");
  const [chatError, setChatError] = useState("");

  async function loadFeed(lens: FeedLens) {
    try {
      const cards = await getFeed<FeedCardDto[]>({ userId, lens, limit: 10 });
      setFeedCards(cards);
      setFeedError("");
    } catch {
      setFeedError("Feed is unavailable right now. You can retry.");
      setFeedCards([]);
    }
  }

  useEffect(() => {
    loadFeed(activeLens);
  }, [activeLens]);

  async function runQuickAction(action: "summarize" | "classify" | "convert_to_task") {
    setLastAction(action);
    if (action === "convert_to_task") {
      return;
    }

    const payload = {
      itemId: "22222222-2222-2222-2222-222222222222",
      rawContent:
        "Investigate onboarding drop-off and synthesize options for reducing first-session friction this week."
    };

    try {
      if (action === "summarize") {
        const response = await summarizeBrainItem<{ ai: { content: string } }>(payload);
        setSummary(response.ai.content);
      } else {
        const response = await classifyBrainItem<{ ai: { content: string } }>(payload);
        setClassification(response.ai.content);
      }
    } catch {
      setLastAction(`${action}_failed`);
    }
  }

  async function runAiQuery(question: string) {
    setLastQuestion(question);
    setChatError("");

    try {
      let activeThreadId = threadId;
      if (!activeThreadId) {
        const created = await createThread<{ id: string }>({
          targetItemId: "22222222-2222-2222-2222-222222222222",
          kind: "item_chat"
        });
        activeThreadId = created.id;
        setThreadId(created.id);
      }

      const response = await queryBrainItemThread<{
        userMessage: { content: string };
        message: { content: string };
        fallbackUsed: boolean;
      }>({
        threadId: activeThreadId,
        question
      });
      setChatMessages((current) => [...current, response.userMessage.content, response.message.content]);
      setChatFallbackNotice(response.fallbackUsed ? "AI fallback used for this response." : "");
    } catch {
      setChatError("Could not reach AI query. You can retry your last message.");
      setChatFallbackNotice("AI query unavailable; defaulting to local echo.");
      setChatMessages((current) => [...current, `You: ${question}`, "Assistant: Local fallback response."]);
    }
  }

  return (
    <main>
      <h1>Yurbrain Web</h1>
      <FeedLensBar
        lenses={["all", "keep_in_mind", "open_loops", "learning", "in_progress", "recently_commented"]}
        activeLens={activeLens}
        onChange={setActiveLens}
      />

      {feedError ? (
        <div>
          <p>{feedError}</p>
          <button onClick={() => loadFeed(activeLens)}>Retry feed</button>
        </div>
      ) : null}
      {!feedError && feedCards.length === 0 ? <p>No cards for this lens yet.</p> : null}
      {feedCards.map((card) => (
        <FeedCard
          key={card.id}
          title={card.title}
          body={card.body}
          onComment={(comment) => setComments((current) => [comment, ...current])}
          onConvertToTask={() => setLastAction("convert_to_task")}
          onDismiss={async () => {
            await dismissFeedCard<{ ok: boolean }>(card.id);
            await loadFeed(activeLens);
          }}
          onSnooze={async (minutes) => {
            await snoozeFeedCard<{ ok: boolean }>(card.id, minutes);
            await loadFeed(activeLens);
          }}
          onRefresh={async () => {
            await refreshFeedCard<{ ok: boolean }>(card.id);
            await loadFeed(activeLens);
          }}
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
        summary={summary}
        classification={classification}
        onQuickAction={runQuickAction}
        onAddComment={(comment) => setComments((current) => [comment, ...current])}
      />
      <ItemChatPanel
        onSend={runAiQuery}
        messages={chatMessages}
        mode="ai_query"
        fallbackNotice={chatFallbackNotice}
        errorMessage={chatError}
        onRetry={lastQuestion ? () => runAiQuery(lastQuestion) : undefined}
      />
      <p>Last quick action: {lastAction}</p>
    </main>
  );
}
