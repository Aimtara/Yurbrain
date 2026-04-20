import type { FounderReviewSignals } from "./types";

const seededUserId = "11111111-1111-1111-1111-111111111111";

export function createMockFounderReviewSignals(now = new Date().toISOString()): FounderReviewSignals {
  return {
    userId: seededUserId,
    windowStart: new Date(Date.now() - 7 * 24 * 3_600_000).toISOString(),
    windowEnd: now,
    items: [
      { id: "item_repo_layer", title: "Repo layer continuity", createdAt: "2026-04-13T06:00:00.000Z", updatedAt: "2026-04-16T01:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: true },
      { id: "item_feed_clarity", title: "Feed clarity pass", createdAt: "2026-04-13T07:00:00.000Z", updatedAt: "2026-04-19T00:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: true },
      { id: "item_founder_mode", title: "Founder mode notes", createdAt: "2026-04-13T08:00:00.000Z", updatedAt: "2026-04-18T13:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: true },
      { id: "item_mobile_parity", title: "Mobile parity thread", createdAt: "2026-04-13T09:00:00.000Z", updatedAt: "2026-04-17T22:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: true },
      { id: "item_ai_grounding", title: "AI grounding review", createdAt: "2026-04-13T10:00:00.000Z", updatedAt: "2026-04-17T09:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: false },
      { id: "item_reentry", title: "Re-entry continuity", createdAt: "2026-04-13T11:00:00.000Z", updatedAt: "2026-04-19T05:00:00.000Z", platformOrigin: "mobile", founderModeAtCapture: false },
      { id: "item_session_flow", title: "Session flow notes", createdAt: "2026-04-13T13:00:00.000Z", updatedAt: "2026-04-13T13:00:00.000Z", platformOrigin: "web", founderModeAtCapture: false },
      { id: "item_item_detail", title: "Item detail thread", createdAt: "2026-04-13T18:00:00.000Z", updatedAt: "2026-04-17T06:00:00.000Z", platformOrigin: "web", founderModeAtCapture: false }
    ],
    feedCards: [
      { id: "card_01", itemId: "item_repo_layer", taskId: "task_repo_layer", cardType: "item", lens: "in_progress", createdAt: "2026-04-13T15:00:00.000Z", dismissed: false, postponeCount: 1, refreshCount: 1, lastPostponedAt: "2026-04-15T00:00:00.000Z", lastRefreshedAt: "2026-04-15T06:00:00.000Z", hasWhyShown: true, hasActionability: true },
      { id: "card_02", itemId: "item_feed_clarity", taskId: null, cardType: "item", lens: "keep_in_mind", createdAt: "2026-04-14T04:00:00.000Z", dismissed: false, postponeCount: 0, refreshCount: 1, lastPostponedAt: null, lastRefreshedAt: "2026-04-16T07:00:00.000Z", hasWhyShown: true, hasActionability: true },
      { id: "card_03", itemId: "item_mobile_parity", taskId: "task_mobile_parity", cardType: "open_loop", lens: "open_loops", createdAt: "2026-04-17T13:00:00.000Z", dismissed: false, postponeCount: 2, refreshCount: 0, lastPostponedAt: "2026-04-18T03:00:00.000Z", lastRefreshedAt: null, hasWhyShown: true, hasActionability: true },
      { id: "card_04", itemId: "item_reentry", taskId: null, cardType: "resume", lens: "recently_commented", createdAt: "2026-04-18T13:00:00.000Z", dismissed: false, postponeCount: 0, refreshCount: 1, lastPostponedAt: null, lastRefreshedAt: "2026-04-19T05:00:00.000Z", hasWhyShown: true, hasActionability: true },
      { id: "card_05", itemId: "item_ai_grounding", taskId: null, cardType: "item", lens: "learning", createdAt: "2026-04-16T13:00:00.000Z", dismissed: true, postponeCount: 0, refreshCount: 0, lastPostponedAt: null, lastRefreshedAt: null, hasWhyShown: true, hasActionability: true },
      { id: "card_06", itemId: "item_founder_mode", taskId: null, cardType: "item", lens: "keep_in_mind", createdAt: "2026-04-18T14:00:00.000Z", dismissed: true, postponeCount: 0, refreshCount: 0, lastPostponedAt: null, lastRefreshedAt: null, hasWhyShown: true, hasActionability: true }
    ],
    tasks: [
      { id: "task_repo_layer", sourceItemId: "item_repo_layer", sourceMessageId: null, status: "in_progress", createdAt: "2026-04-16T02:00:00.000Z", updatedAt: "2026-04-16T03:00:00.000Z", platformOrigin: "web" },
      { id: "task_mobile_parity", sourceItemId: "item_mobile_parity", sourceMessageId: null, status: "done", createdAt: "2026-04-17T14:00:00.000Z", updatedAt: "2026-04-17T16:00:00.000Z", platformOrigin: "mobile" },
      { id: "task_ai_grounding", sourceItemId: "item_ai_grounding", sourceMessageId: null, status: "todo", createdAt: "2026-04-17T10:00:00.000Z", updatedAt: "2026-04-17T10:00:00.000Z", platformOrigin: "web" }
    ],
    sessions: [
      { id: "session_01", taskId: "task_repo_layer", state: "running", startedAt: "2026-04-16T04:00:00.000Z", endedAt: null },
      { id: "session_02", taskId: "task_mobile_parity", state: "running", startedAt: "2026-04-17T15:00:00.000Z", endedAt: null },
      { id: "session_03", taskId: "task_mobile_parity", state: "finished", startedAt: "2026-04-17T15:30:00.000Z", endedAt: "2026-04-17T16:00:00.000Z" }
    ],
    messages: [
      { id: "msg_01", itemId: "item_repo_layer", threadId: "thread_repo", role: "user", createdAt: "2026-04-16T05:00:00.000Z", platform: "web" },
      { id: "msg_02", itemId: "item_mobile_parity", threadId: "thread_mobile_parity", role: "user", createdAt: "2026-04-17T14:30:00.000Z", platform: "mobile" },
      { id: "msg_03", itemId: "item_reentry", threadId: "thread_reentry", role: "user", createdAt: "2026-04-19T05:00:00.000Z", platform: "web" }
    ],
    artifacts: [
      { id: "art_01", itemId: "item_repo_layer", type: "summary", createdAt: "2026-04-16T06:00:00.000Z" },
      { id: "art_02", itemId: "item_repo_layer", type: "classification", createdAt: "2026-04-16T06:00:00.000Z" },
      { id: "art_03", itemId: "item_ai_grounding", type: "summary", createdAt: "2026-04-17T11:00:00.000Z" }
    ],
    founderModeEnabled: true
  };
}
