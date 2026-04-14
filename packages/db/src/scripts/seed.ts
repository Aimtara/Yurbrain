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
    const itemOneId = randomUUID();
    const itemTwoId = randomUUID();
    const itemThreeId = randomUUID();

    const threadOneId = randomUUID();
    const threadTwoId = randomUUID();

    const taskOneId = randomUUID();
    const taskTwoId = randomUUID();
    const taskThreeId = randomUUID();

    await repo.createBrainItem({
      id: itemOneId,
      userId,
      type: "note",
      title: "Capture standup commitments",
      rawContent: "Remember to send API reliability update and verify e2e route coverage.",
      status: "active",
      createdAt: isoMinutesAgo(90),
      updatedAt: isoMinutesAgo(85)
    });
    await repo.createBrainItem({
      id: itemTwoId,
      userId,
      type: "link",
      title: "Review Cursor cloud setup guide",
      rawContent: "https://cursor.com/onboard",
      status: "active",
      createdAt: isoMinutesAgo(70),
      updatedAt: isoMinutesAgo(55)
    });
    await repo.createBrainItem({
      id: itemThreeId,
      userId,
      type: "idea",
      title: "AI-assisted weekly recap digest",
      rawContent: "Generate a Friday digest from high-confidence feed cards and completed tasks.",
      status: "archived",
      createdAt: isoMinutesAgo(45),
      updatedAt: isoMinutesAgo(30)
    });

    await repo.appendEvent({
      id: randomUUID(),
      userId,
      eventType: "brain_item_created",
      payload: { id: itemOneId, type: "note", seeded: true },
      occurredAt: isoMinutesAgo(89)
    });
    await repo.appendEvent({
      id: randomUUID(),
      userId,
      eventType: "brain_item_created",
      payload: { id: itemTwoId, type: "link", seeded: true },
      occurredAt: isoMinutesAgo(69)
    });
    await repo.appendEvent({
      id: randomUUID(),
      userId,
      eventType: "brain_item_updated",
      payload: { id: itemThreeId, type: "idea", seeded: true, status: "archived" },
      occurredAt: isoMinutesAgo(29)
    });

    await repo.createThread({
      id: threadOneId,
      targetItemId: itemOneId,
      kind: "item_comment",
      createdAt: isoMinutesAgo(82),
      updatedAt: isoMinutesAgo(75)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: threadOneId,
      role: "user",
      content: "Can this be turned into a task for this sprint?",
      createdAt: isoMinutesAgo(81)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: threadOneId,
      role: "assistant",
      content: "Yes, split this into API verification and docs update subtasks.",
      createdAt: isoMinutesAgo(80)
    });

    await repo.createThread({
      id: threadTwoId,
      targetItemId: itemTwoId,
      kind: "item_chat",
      createdAt: isoMinutesAgo(54),
      updatedAt: isoMinutesAgo(53)
    });
    await repo.createMessage({
      id: randomUUID(),
      threadId: threadTwoId,
      role: "user",
      content: "Summarize the setup guide in 3 bullets.",
      createdAt: isoMinutesAgo(54)
    });

    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "item",
      lens: "all",
      itemId: itemOneId,
      title: "Follow up on standup commitments",
      body: "Two tasks are still open; prioritize API reliability checks first.",
      dismissed: false,
      createdAt: isoMinutesAgo(74)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "open_loop",
      lens: "open_loops",
      itemId: itemTwoId,
      title: "Finish onboarding checklist",
      body: "Environment setup still needs seed/reset verification from clean checkout.",
      dismissed: false,
      createdAt: isoMinutesAgo(52)
    });
    await repo.createFeedCard({
      id: randomUUID(),
      userId,
      cardType: "digest",
      lens: "learning",
      itemId: itemThreeId,
      title: "Weekly learning digest",
      body: "Prototype digest idea was archived but remains useful for planning discussions.",
      dismissed: false,
      createdAt: isoMinutesAgo(28)
    });

    await repo.createTask({
      id: taskOneId,
      userId,
      sourceItemId: itemOneId,
      sourceMessageId: null,
      title: "Validate API + e2e reliability flow",
      status: "in_progress",
      createdAt: isoMinutesAgo(72),
      updatedAt: isoMinutesAgo(40)
    });
    await repo.createTask({
      id: taskTwoId,
      userId,
      sourceItemId: itemTwoId,
      sourceMessageId: null,
      title: "Document from-scratch setup steps",
      status: "todo",
      createdAt: isoMinutesAgo(50),
      updatedAt: isoMinutesAgo(50)
    });
    await repo.createTask({
      id: taskThreeId,
      userId,
      sourceItemId: itemThreeId,
      sourceMessageId: null,
      title: "Archive digest experiment outcomes",
      status: "done",
      createdAt: isoMinutesAgo(34),
      updatedAt: isoMinutesAgo(20)
    });

    await repo.createSession({
      id: randomUUID(),
      taskId: taskOneId,
      state: "running",
      startedAt: isoMinutesAgo(35),
      endedAt: null
    });
    await repo.createSession({
      id: randomUUID(),
      taskId: taskThreeId,
      state: "finished",
      startedAt: isoMinutesAgo(24),
      endedAt: isoMinutesAgo(21)
    });

    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemOneId,
      type: "summary",
      payload: {
        content: "Standup item captures unresolved reliability checks and documentation work.",
        metadata: { seeded: true, source: "seed-script" }
      },
      confidence: 0.96,
      createdAt: isoMinutesAgo(73)
    });
    await repo.createArtifact({
      id: randomUUID(),
      itemId: itemTwoId,
      type: "classification",
      payload: {
        labels: ["onboarding", "devex"],
        rationale: "Points to environment setup and repeatable local workflow."
      },
      confidence: 0.9,
      createdAt: isoMinutesAgo(51)
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
