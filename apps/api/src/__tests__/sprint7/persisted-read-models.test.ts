import assert from "node:assert/strict";
import test from "node:test";

import { app } from "../../server";

test.after(async () => {
  await app.close();
});

test("GET /brain-items/:id/artifacts returns persisted AI artifacts", async () => {
  const userId = "66666666-6666-4666-8666-666666666666";
  const createItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Artifact persistence check",
      rawContent: "Ensure summary and classification artifacts can be fetched later."
    }
  });
  assert.equal(createItem.statusCode, 201);
  const item = createItem.json<{ id: string; rawContent: string }>();

  const summarize = await app.inject({
    method: "POST",
    url: "/ai/summarize",
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(summarize.statusCode, 201);

  const classify = await app.inject({
    method: "POST",
    url: "/ai/classify",
    payload: {
      itemId: item.id,
      rawContent: item.rawContent
    }
  });
  assert.equal(classify.statusCode, 201);

  const allArtifacts = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts`
  });
  assert.equal(allArtifacts.statusCode, 200);
  const all = allArtifacts.json<Array<{ id: string; type: string }>>();
  assert.ok(all.length >= 2);
  assert.ok(all.some((artifact) => artifact.type === "summary"));
  assert.ok(all.some((artifact) => artifact.type === "classification"));

  const summaryOnly = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/artifacts?type=summary`
  });
  assert.equal(summaryOnly.statusCode, 200);
  const summaries = summaryOnly.json<Array<{ type: string }>>();
  assert.ok(summaries.length >= 1);
  assert.ok(summaries.every((artifact) => artifact.type === "summary"));
});

test("GET /sessions supports task and user filters", async () => {
  const userId = "67676767-6767-4676-8676-676767676767";
  const createTask = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Session retrieval check"
    }
  });
  assert.equal(createTask.statusCode, 201);
  const task = createTask.json<{ id: string }>();

  const start = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(start.statusCode, 201);
  const session = start.json<{ id: string; taskId: string; state: string }>();

  const byTask = await app.inject({
    method: "GET",
    url: `/sessions?taskId=${task.id}`
  });
  assert.equal(byTask.statusCode, 200);
  const taskSessions = byTask.json<Array<{ id: string; taskId: string }>>();
  assert.ok(taskSessions.some((entry) => entry.id === session.id && entry.taskId === task.id));

  const byUser = await app.inject({
    method: "GET",
    url: `/sessions?userId=${userId}`
  });
  assert.equal(byUser.statusCode, 200);
  const userSessions = byUser.json<Array<{ id: string }>>();
  assert.ok(userSessions.some((entry) => entry.id === session.id));
});

test("preferences routes persist founder mode and lens", async () => {
  const userId = "68686868-6868-4686-8686-686868686868";
  const initial = await app.inject({
    method: "GET",
    url: `/preferences/${userId}`
  });
  assert.equal(initial.statusCode, 200);
  assert.equal(initial.json<{ founderMode: boolean; defaultLens: string }>().founderMode, false);

  const updated = await app.inject({
    method: "PUT",
    url: `/preferences/${userId}`,
    payload: {
      defaultLens: "open_loops",
      founderMode: true
    }
  });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.json<{ founderMode: boolean; defaultLens: string }>().defaultLens, "open_loops");
  assert.equal(updated.json<{ founderMode: boolean; defaultLens: string }>().founderMode, true);

  const persisted = await app.inject({
    method: "GET",
    url: `/preferences/${userId}`
  });
  assert.equal(persisted.statusCode, 200);
  const body = persisted.json<{ founderMode: boolean; defaultLens: string }>();
  assert.equal(body.defaultLens, "open_loops");
  assert.equal(body.founderMode, true);
});

test("brain item execution metadata persists and powers continuity endpoints", async () => {
  const userId = "69696969-6969-4696-8696-696969696969";
  const createItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Execution metadata check",
      rawContent: "Need a persisted execution hint and progress summary."
    }
  });
  assert.equal(createItem.statusCode, 201);
  const item = createItem.json<{ id: string }>();

  const patch = await app.inject({
    method: "PATCH",
    url: `/brain-items/${item.id}`,
    payload: {
      execution: {
        status: "blocked",
        priority: "high",
        nextStep: "Write one unblock note.",
        progressSummary: "Blocked on missing integration evidence."
      }
    }
  });
  assert.equal(patch.statusCode, 200);

  const fetched = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}`
  });
  assert.equal(fetched.statusCode, 200);
  const fetchedBody = fetched.json<{ execution?: { status?: string; nextStep?: string } }>();
  assert.equal(fetchedBody.execution?.status, "blocked");
  assert.equal(fetchedBody.execution?.nextStep, "Write one unblock note.");

  const progress = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/progress-summary`
  });
  assert.equal(progress.statusCode, 200);
  const progressBody = progress.json<{ summary: string; signals: { executionStatus?: string } }>();
  assert.equal(progressBody.signals.executionStatus, "blocked");
  assert.match(progressBody.summary, /blocked|smallest next move|unblock/i);

  const nextStep = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/next-step`
  });
  assert.equal(nextStep.statusCode, 200);
  const nextStepBody = nextStep.json<{ source: string; nextStep: string }>();
  assert.equal(nextStepBody.source, "execution_metadata");
  assert.equal(nextStepBody.nextStep, "Write one unblock note.");
});

test("progress summary and next step stay concise, grounded, and explainable", async () => {
  const userId = "81818181-8181-4818-8818-818181818181";
  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Founder continuity quality check",
      rawContent: "Need to move this from idea to one concrete action."
    }
  });
  assert.equal(created.statusCode, 201);
  const item = created.json<{ id: string }>();

  const taskResp = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Convert idea into one testable action",
      sourceItemId: item.id
    }
  });
  assert.equal(taskResp.statusCode, 201);
  const task = taskResp.json<{ id: string }>();

  const inProgress = await app.inject({
    method: "PATCH",
    url: `/tasks/${task.id}`,
    payload: { status: "in_progress" }
  });
  assert.equal(inProgress.statusCode, 200);

  const startSession = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(startSession.statusCode, 201);

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    payload: {
      targetItemId: item.id,
      kind: "item_comment"
    }
  });
  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();

  const messageResp = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      threadId: thread.id,
      role: "user",
      content: "Left off drafting acceptance criteria."
    }
  });
  assert.equal(messageResp.statusCode, 201);

  const progress = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/progress-summary`
  });
  assert.equal(progress.statusCode, 200);
  const progressBody = progress.json<{ summary: string; signals: { hasRunningSession: boolean; linkedTaskStatus?: string } }>();
  assert.match(progressBody.summary, /smallest next move|latest continuation note|momentum is active/i);
  assert.match(progressBody.summary, /running session|active task|latest note/i);
  assert.equal(progressBody.signals.hasRunningSession, true);
  assert.equal(progressBody.signals.linkedTaskStatus, "in_progress");

  const nextStep = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/next-step`
  });
  assert.equal(nextStep.statusCode, 200);
  const nextStepBody = nextStep.json<{ source: string; nextStep: string; reason: string }>();
  assert.equal(nextStepBody.source, "task");
  assert.match(nextStepBody.reason, /status|session|progress/i);
  assert.match(nextStepBody.nextStep, /10 minutes|resume|session|task/i);
});

test("continuity endpoints use graceful fallback when item has minimal signals", async () => {
  const userId = "82828282-8282-4828-8828-828282828282";
  const created = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Minimal continuity signals",
      rawContent: "Just captured, no follow-up yet."
    }
  });
  assert.equal(created.statusCode, 201);
  const item = created.json<{ id: string }>();

  const progress = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/progress-summary`
  });
  assert.equal(progress.statusCode, 200);
  const progressBody = progress.json<{ summary: string }>();
  assert.match(progressBody.summary, /smallest next move|continue/i);

  const nextStep = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/next-step`
  });
  assert.equal(nextStep.statusCode, 200);
  const nextStepBody = nextStep.json<{ source: string; reason: string; nextStep: string }>();
  assert.equal(nextStepBody.source, "fallback");
  assert.match(nextStepBody.reason, /limited|signal|yet/i);
  assert.match(nextStepBody.nextStep, /one note|one action|10-minute|10 minutes/i);
});

test("feed supports founder execution lens filtering", async () => {
  const userId = "70707070-7070-4707-8707-707070707070";
  const blockedItemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Blocked item",
      rawContent: "This one is currently blocked."
    }
  });
  assert.equal(blockedItemResp.statusCode, 201);
  const blockedItem = blockedItemResp.json<{ id: string }>();

  const plannedItemResp = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Planned item",
      rawContent: "This one is ready to move."
    }
  });
  assert.equal(plannedItemResp.statusCode, 201);
  const plannedItem = plannedItemResp.json<{ id: string }>();

  await app.inject({
    method: "PATCH",
    url: `/brain-items/${blockedItem.id}`,
    payload: {
      execution: {
        status: "blocked",
        nextStep: "Add one unblock note."
      }
    }
  });
  await app.inject({
    method: "PATCH",
    url: `/brain-items/${plannedItem.id}`,
    payload: {
      execution: {
        status: "planned",
        nextStep: "Start a 10 minute kickoff session."
      }
    }
  });

  const blockedLensResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=needs_unblock`
  });
  assert.equal(blockedLensResp.statusCode, 200);
  const blockedLensCards = blockedLensResp.json<Array<{ itemId: string | null }>>();
  assert.ok(blockedLensCards.length >= 1);
  assert.ok(blockedLensCards.every((card) => card.itemId === blockedItem.id));

  const readyLensResp = await app.inject({
    method: "GET",
    url: `/feed?userId=${userId}&founderMode=true&executionLens=ready_to_move`
  });
  assert.equal(readyLensResp.statusCode, 200);
  const readyLensCards = readyLensResp.json<Array<{ itemId: string | null }>>();
  assert.ok(readyLensCards.some((card) => card.itemId === plannedItem.id));
});

test("continuity endpoints explain signals without generic AI tone", async () => {
  const userId = "81818181-8181-4818-8818-818181818181";
  const createItem = await app.inject({
    method: "POST",
    url: "/brain-items",
    payload: {
      userId,
      type: "note",
      title: "Continuity explanation check",
      rawContent: "Need a grounded explanation for summary and next step."
    }
  });
  assert.equal(createItem.statusCode, 201);
  const item = createItem.json<{ id: string }>();

  const threadResp = await app.inject({
    method: "POST",
    url: "/threads",
    payload: {
      targetItemId: item.id,
      kind: "item_comment"
    }
  });
  assert.equal(threadResp.statusCode, 201);
  const thread = threadResp.json<{ id: string }>();

  const commentResp = await app.inject({
    method: "POST",
    url: "/messages",
    payload: {
      threadId: thread.id,
      role: "user",
      content: "I stalled because I need one concrete next move."
    }
  });
  assert.equal(commentResp.statusCode, 201);

  const taskResp = await app.inject({
    method: "POST",
    url: "/tasks",
    payload: {
      userId,
      title: "Turn this into one action",
      sourceItemId: item.id
    }
  });
  assert.equal(taskResp.statusCode, 201);
  const task = taskResp.json<{ id: string }>();

  const taskInProgress = await app.inject({
    method: "PATCH",
    url: `/tasks/${task.id}`,
    payload: { status: "in_progress" }
  });
  assert.equal(taskInProgress.statusCode, 200);

  const startSession = await app.inject({
    method: "POST",
    url: `/tasks/${task.id}/start`,
    payload: {}
  });
  assert.equal(startSession.statusCode, 201);

  const progressResp = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/progress-summary`
  });
  assert.equal(progressResp.statusCode, 200);
  const progressBody = progressResp.json<{ summary: string; signals: { hasRunningSession: boolean } }>();
  assert.equal(progressBody.signals.hasRunningSession, true);
  assert.match(progressBody.summary, /momentum is active|latest continuation note|smallest next move/i);

  const nextStepResp = await app.inject({
    method: "GET",
    url: `/brain-items/${item.id}/next-step`
  });
  assert.equal(nextStepResp.statusCode, 200);
  const nextStepBody = nextStepResp.json<{ nextStep: string; reason: string; source: string }>();
  assert.ok(nextStepBody.nextStep.length > 0);
  assert.match(nextStepBody.reason, /because|shows|signal|based on/i);
  assert.equal(nextStepBody.source, "task");
});
