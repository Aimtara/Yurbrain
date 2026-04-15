import { randomUUID } from "node:crypto";
import { createDbRepository } from "../index";
import { getDefaultDatabasePath, getDefaultMigrationsPath } from "../paths";

const databasePath = process.env.YURBRAIN_DB_PATH ?? getDefaultDatabasePath();
const migrationsPath = process.env.YURBRAIN_MIGRATIONS_PATH ?? getDefaultMigrationsPath();
const userId = process.env.YURBRAIN_SEED_USER_ID ?? "11111111-1111-1111-1111-111111111111";

function isoMinutesAgo(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function main() {
  const repo = createDbRepository({ databasePath, migrationsPath });
  try {
    const seededItems = [
      {
        type: "note" as const,
        title: "Capture standup commitments",
        rawContent: "Remember to send API reliability update and verify e2e route coverage.",
        status: "active" as const,
        execution: {
          status: "in_progress" as const,
          priority: "high" as const,
          nextStep: "Run API tests and confirm persistence expectations.",
          progressSummary: "Reliability validation is underway with tests in progress."
        }
      },
      { type: "link" as const, title: "Review Cursor cloud setup guide", rawContent: "https://cursor.com/onboard", status: "active" as const },
      { type: "idea" as const, title: "AI-assisted weekly recap digest", rawContent: "Generate a Friday digest from high-confidence feed cards and completed tasks.", status: "archived" as const },
      {
        type: "note" as const,
        title: "Draft onboarding fix rollout",
        rawContent: "List top 3 confusing steps and propose smallest fix per step.",
        status: "active" as const,
        execution: {
          status: "blocked" as const,
          priority: "normal" as const,
          nextStep: "Add one unblock note about missing QA evidence."
        }
      },
      { type: "quote" as const, title: "Momentum quote", rawContent: "Clarity reduces resistance; reduce resistance daily.", status: "active" as const },
      { type: "idea" as const, title: "Session-first execution flow", rawContent: "Use sessions as execution truth and tasks as intent memory.", status: "active" as const },
      { type: "note" as const, title: "Bug triage shortlist", rawContent: "Prioritize persistence bugs, feed regressions, and auth blockers.", status: "active" as const },
      { type: "link" as const, title: "Drizzle migration docs", rawContent: "https://orm.drizzle.team/docs/migrations", status: "active" as const },
      { type: "note" as const, title: "Support conversation summary", rawContent: "User asked for richer why-shown explanations in feed cards.", status: "active" as const },
      {
        type: "idea" as const,
        title: "Manual QA script",
        rawContent: "Codify create item -> feed -> chat -> convert -> start/finish session journey.",
        status: "active" as const,
        execution: {
          status: "candidate" as const,
          priority: "normal" as const,
          nextStep: "Convert this into one concrete test checklist task."
        }
      },
      { type: "file" as const, title: "Roadmap notes export", rawContent: "Quarterly roadmap export file reference placeholder for MVP.", status: "active" as const },
      { type: "note" as const, title: "Celebrate shipped loop", rawContent: "Write release note once the MVP loop is end-to-end persistent.", status: "active" as const }
    ];

    const itemIds = await Promise.all(
      seededItems.map(async (seed, index) => {
        const id = randomUUID();
        const createdAt = isoMinutesAgo(210 - index * 11);
        const updatedAt = isoMinutesAgo(205 - index * 9);
        await repo.createBrainItem({
          id,
          userId,
          type: seed.type,
          title: seed.title,
          rawContent: seed.rawContent,
          status: seed.status,
          execution: seed.execution,
          createdAt,
          updatedAt
        });
        await repo.appendEvent({
          id: randomUUID(),
          userId,
          eventType: "brain_item_created",
          payload: { id, seeded: true, index },
          occurredAt: createdAt
        });
        return id;
      })
    );

    await repo.appendEvent({
      id: randomUUID(),
      userId,
      eventType: "brain_item_updated",
      payload: { id: itemIds[2], seeded: true, status: "archived" },
      occurredAt: isoMinutesAgo(95)
    });

    const commentThreadId = randomUUID();
    const chatThreadId = randomUUID();
    const followUpThreadId = randomUUID();

    await repo.createThread({
      id: commentThreadId,
      targetItemId: itemIds[0],
      kind: "item_comment",
      createdAt: isoMinutesAgo(170),
      updatedAt: isoMinutesAgo(130)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: commentThreadId,
      role: "user",
      content: "Can this be turned into a concrete task for this sprint?",
      createdAt: isoMinutesAgo(169)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: commentThreadId,
      role: "assistant",
      content: "Yes. Start with API persistence verification, then run the full loop smoke test.",
      createdAt: isoMinutesAgo(168)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: commentThreadId,
      role: "user",
      content: "Add one task for docs updates after tests pass.",
      createdAt: isoMinutesAgo(167)
    });

    await repo.createThread({
      id: chatThreadId,
      targetItemId: itemIds[1],
      kind: "item_chat",
      createdAt: isoMinutesAgo(160),
      updatedAt: isoMinutesAgo(140)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: chatThreadId,
      role: "user",
      content: "Summarize the setup guide in 3 bullets.",
      createdAt: isoMinutesAgo(159)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: chatThreadId,
      role: "assistant",
      content: "Install dependencies, reset/seed DB, and run tests before app startup.",
      createdAt: isoMinutesAgo(158)
    });

    await repo.createThread({
      id: followUpThreadId,
      targetItemId: itemIds[3],
      kind: "item_comment",
      createdAt: isoMinutesAgo(120),
      updatedAt: isoMinutesAgo(110)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: followUpThreadId,
      role: "user",
      content: "Need deterministic feed explanations before launch.",
      createdAt: isoMinutesAgo(119)
    });

    const taskOneId = randomUUID();
    const taskTwoId = randomUUID();
    const taskThreeId = randomUUID();
    const taskFourId = randomUUID();

    await repo.createTask({
      id: taskOneId,
      userId,
      sourceItemId: itemIds[0],
      sourceMessageId: null,
      title: "Validate API + e2e reliability flow",
      status: "in_progress",
      createdAt: isoMinutesAgo(150),
      updatedAt: isoMinutesAgo(70)
    });
    await repo.createTask({
      id: taskTwoId,
      userId,
      sourceItemId: itemIds[1],
      sourceMessageId: null,
      title: "Document from-scratch setup steps",
      status: "todo",
      createdAt: isoMinutesAgo(145),
      updatedAt: isoMinutesAgo(145)
    });
    await repo.createTask({
      id: taskThreeId,
      userId,
      sourceItemId: itemIds[2],
      sourceMessageId: null,
      title: "Archive digest experiment outcomes",
      status: "done",
      createdAt: isoMinutesAgo(140),
      updatedAt: isoMinutesAgo(90)
    });
    await repo.createTask({
      id: taskFourId,
      userId,
      sourceItemId: itemIds[3],
      sourceMessageId: null,
      title: "Ship feed why-shown copy improvements",
      status: "done",
      createdAt: isoMinutesAgo(138),
      updatedAt: isoMinutesAgo(88)
    });

    await repo.createSession({
      id: randomUUID(),
      taskId: taskOneId,
      state: "running",
      startedAt: isoMinutesAgo(75),
      endedAt: null
    });
    await repo.createSession({
      id: randomUUID(),
      taskId: taskThreeId,
      state: "finished",
      startedAt: isoMinutesAgo(100),
      endedAt: isoMinutesAgo(94)
    });
    await repo.createSession({
      id: randomUUID(),
      taskId: taskFourId,
      state: "finished",
      startedAt: isoMinutesAgo(99),
      endedAt: isoMinutesAgo(89)
    });

    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "item",
      lens: "all",
      itemId: itemIds[0],
      taskId: null,
      title: "Follow up on standup commitments",
      body: "Two tasks are still open; prioritize API reliability checks first.",
      dismissed: false,
      createdAt: isoMinutesAgo(148)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "open_loop",
      lens: "open_loops",
      itemId: itemIds[1],
      taskId: null,
      title: "Finish onboarding checklist",
      body: "Environment setup still needs seed/reset verification from clean checkout.",
      dismissed: false,
      createdAt: isoMinutesAgo(136)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "digest",
      lens: "learning",
      itemId: itemIds[2],
      taskId: null,
      title: "Weekly learning digest",
      body: "Prototype digest idea was archived but remains useful for planning discussions.",
      dismissed: false,
      createdAt: isoMinutesAgo(132)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "resume",
      lens: "in_progress",
      itemId: null,
      taskId: taskOneId,
      title: "Resume active reliability task",
      body: "Session is running. Continue and finish API + e2e reliability checks.",
      dismissed: false,
      createdAt: isoMinutesAgo(74)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "opportunity",
      lens: "keep_in_mind",
      itemId: itemIds[4],
      taskId: null,
      title: "Turn quote into habit",
      body: "Schedule a daily review block to keep friction low and execution high.",
      dismissed: false,
      createdAt: isoMinutesAgo(126)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "cluster",
      lens: "recently_commented",
      itemId: itemIds[0],
      taskId: null,
      title: "Comment activity needs closure",
      body: "Comments mention converting this item into concrete execution work.",
      dismissed: false,
      createdAt: isoMinutesAgo(124)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "item",
      lens: "learning",
      itemId: itemIds[7],
      taskId: null,
      title: "Migration docs refresher",
      body: "Review migration constraints and index strategy before schema updates.",
      dismissed: false,
      createdAt: isoMinutesAgo(118)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "open_loop",
      lens: "open_loops",
      itemId: itemIds[9],
      taskId: null,
      title: "Manual QA flow incomplete",
      body: "Run capture -> feed -> comment -> AI -> convert -> session flow and document outcomes.",
      dismissed: false,
      createdAt: isoMinutesAgo(112)
    });

    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemIds[0],
      type: "summary",
      payload: {
        content: "Standup item captures unresolved reliability checks and documentation work.",
        metadata: { seeded: true, source: "seed-script" }
      },
      confidence: 0.96,
      createdAt: isoMinutesAgo(147)
    });
    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemIds[0],
      type: "classification",
      payload: {
        content: "execution_task_candidate",
        rationale: "Contains concrete action language and urgency."
      },
      confidence: 0.92,
      createdAt: isoMinutesAgo(146)
    });
    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemIds[0],
      type: "summary",
      payload: {
        content: "Latest summary: prioritize persistence tests, then update docs.",
        metadata: { seeded: true, revision: 2 }
      },
      confidence: 0.94,
      createdAt: isoMinutesAgo(72)
    });
    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemIds[1],
      type: "classification",
      payload: {
        labels: ["onboarding", "devex"],
        rationale: "Points to environment setup and repeatable local workflow."
      },
      confidence: 0.9,
      createdAt: isoMinutesAgo(135)
    });

    console.log(`Seeded usable test data for user ${userId} into ${databasePath}`);
  } finally {
    await repo.close();
  }
}

main().catch((error) => {
  console.error("Failed to seed database", error);
  process.exit(1);
});
