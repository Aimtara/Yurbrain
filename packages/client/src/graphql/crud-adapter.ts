import { getConfiguredCurrentUserId } from "../api/client";
import { hasuraGraphqlRequest } from "./hasura-client";

type BrainItemRow = {
  id: string;
  user_id: string;
  type: "note" | "link" | "idea" | "quote" | "file";
  content_type?: "text" | "link" | "image" | null;
  title: string;
  raw_content: string;
  source_app?: string | null;
  source_link?: string | null;
  status: "active" | "archived";
  topic_guess?: string | null;
  created_at: string;
  updated_at: string;
};

type ArtifactRow = {
  id: string;
  item_id: string;
  type: "summary" | "classification" | "relation" | "feed_card";
  payload: Record<string, unknown>;
  confidence: string | number;
  created_at: string;
};

type ThreadRow = {
  id: string;
  target_item_id: string;
  kind: "item_comment" | "item_chat";
  created_at: string;
  updated_at: string;
};

type MessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

type TaskRow = {
  id: string;
  user_id: string;
  source_item_id: string | null;
  source_message_id: string | null;
  title: string;
  status: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
};

type SessionRow = {
  id: string;
  task_id: string;
  state: "running" | "paused" | "finished";
  started_at: string;
  ended_at: string | null;
};

type PreferenceRow = {
  user_id: string;
  default_lens: "all" | "keep_in_mind" | "open_loops" | "learning" | "in_progress" | "recently_commented";
  clean_focus_mode: boolean;
  founder_mode: boolean;
  render_mode: "focus" | "explore";
  ai_summary_mode: "concise" | "balanced" | "detailed";
  feed_density: "comfortable" | "compact";
  resurfacing_intensity: "gentle" | "balanced" | "active";
  updated_at: string;
};

type TaskListQuery = {
  status?: "todo" | "in_progress" | "done";
  userId?: string;
};

type SessionListQuery = {
  taskId?: string;
  userId?: string;
  state?: "running" | "paused" | "finished";
};

type UpdatePreferenceInput = {
  defaultLens?: PreferenceRow["default_lens"];
  cleanFocusMode?: boolean;
  founderMode?: boolean;
  renderMode?: PreferenceRow["render_mode"];
  aiSummaryMode?: PreferenceRow["ai_summary_mode"];
  feedDensity?: PreferenceRow["feed_density"];
  resurfacingIntensity?: PreferenceRow["resurfacing_intensity"];
};

function requireCurrentUserId(): string {
  const userId = getConfiguredCurrentUserId();
  if (!userId) {
    throw new Error("Current user is required for GraphQL CRUD access");
  }
  return userId;
}

function mapBrainItem(row: BrainItemRow) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    contentType: row.content_type ?? "text",
    title: row.title,
    rawContent: row.raw_content,
    sourceApp: row.source_app ?? null,
    sourceLink: row.source_link ?? null,
    topicGuess: row.topic_guess ?? null,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapArtifact(row: ArtifactRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    type: row.type,
    payload: row.payload,
    confidence: typeof row.confidence === "number" ? row.confidence : Number(row.confidence),
    createdAt: row.created_at
  };
}

function mapThread(row: ThreadRow) {
  return {
    id: row.id,
    targetItemId: row.target_item_id,
    kind: row.kind,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    threadId: row.thread_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at
  };
}

function mapTask(row: TaskRow) {
  return {
    id: row.id,
    userId: row.user_id,
    sourceItemId: row.source_item_id,
    sourceMessageId: row.source_message_id,
    title: row.title,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapSession(row: SessionRow) {
  return {
    id: row.id,
    taskId: row.task_id,
    state: row.state,
    startedAt: row.started_at,
    endedAt: row.ended_at
  };
}

function mapPreference(row: PreferenceRow) {
  return {
    userId: row.user_id,
    defaultLens: row.default_lens,
    cleanFocusMode: row.clean_focus_mode,
    founderMode: row.founder_mode,
    renderMode: row.render_mode,
    aiSummaryMode: row.ai_summary_mode,
    feedDensity: row.feed_density,
    resurfacingIntensity: row.resurfacing_intensity,
    updatedAt: row.updated_at
  };
}

function defaultPreference(userId: string) {
  return {
    userId,
    defaultLens: "all" as const,
    cleanFocusMode: true,
    founderMode: false,
    renderMode: "focus" as const,
    aiSummaryMode: "balanced" as const,
    feedDensity: "comfortable" as const,
    resurfacingIntensity: "balanced" as const,
    updatedAt: new Date().toISOString()
  };
}

async function assertItemAccess(itemId: string, userId: string) {
  const data = await hasuraGraphqlRequest<{ brain_items: Array<{ id: string }> }>(
    `
      query GraphqlAssertItemAccess($itemId: uuid!, $userId: uuid!) {
        brain_items(where: { id: { _eq: $itemId }, user_id: { _eq: $userId } }, limit: 1) {
          id
        }
      }
    `,
    { itemId, userId }
  );
  if (data.brain_items.length === 0) {
    throw new Error("Brain item not found");
  }
}

async function getThreadForUser(threadId: string, userId: string): Promise<ThreadRow> {
  const data = await hasuraGraphqlRequest<{ item_threads_by_pk: ThreadRow | null }>(
    `
      query GraphqlThreadByPk($threadId: uuid!) {
        item_threads_by_pk(id: $threadId) {
          id
          target_item_id
          kind
          created_at
          updated_at
        }
      }
    `,
    { threadId }
  );
  const thread = data.item_threads_by_pk;
  if (!thread) {
    throw new Error("Thread not found");
  }
  await assertItemAccess(thread.target_item_id, userId);
  return thread;
}

async function getTaskForUser(taskId: string, userId: string): Promise<TaskRow> {
  const data = await hasuraGraphqlRequest<{ tasks: TaskRow[] }>(
    `
      query GraphqlTaskByIdForUser($taskId: uuid!, $userId: uuid!) {
        tasks(where: { id: { _eq: $taskId }, user_id: { _eq: $userId } }, limit: 1) {
          id
          user_id
          source_item_id
          source_message_id
          title
          status
          created_at
          updated_at
        }
      }
    `,
    { taskId, userId }
  );
  const task = data.tasks[0];
  if (!task) {
    throw new Error("Task not found");
  }
  return task;
}

export async function listBrainItemsGraphql<T>(): Promise<T> {
  const userId = requireCurrentUserId();
  const data = await hasuraGraphqlRequest<{ brain_items: BrainItemRow[] }>(
    `
      query GraphqlListBrainItems($userId: uuid!) {
        brain_items(where: { user_id: { _eq: $userId } }, order_by: [{ created_at: desc }, { id: asc }]) {
          id
          user_id
          type
          content_type
          title
          raw_content
          source_app
          source_link
          topic_guess
          status
          created_at
          updated_at
        }
      }
    `,
    { userId }
  );
  return data.brain_items.map(mapBrainItem) as T;
}

export async function getBrainItemGraphql<T>(itemId: string): Promise<T> {
  const userId = requireCurrentUserId();
  const data = await hasuraGraphqlRequest<{ brain_items: BrainItemRow[] }>(
    `
      query GraphqlGetBrainItem($itemId: uuid!, $userId: uuid!) {
        brain_items(where: { id: { _eq: $itemId }, user_id: { _eq: $userId } }, limit: 1) {
          id
          user_id
          type
          content_type
          title
          raw_content
          source_app
          source_link
          topic_guess
          status
          created_at
          updated_at
        }
      }
    `,
    { itemId, userId }
  );
  const item = data.brain_items[0];
  if (!item) {
    throw new Error("Brain item not found");
  }
  return mapBrainItem(item) as T;
}

export async function createBrainItemGraphql<T>(payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  const input = payload as {
    type: BrainItemRow["type"];
    title: string;
    rawContent: string;
    contentType?: BrainItemRow["content_type"];
    sourceApp?: string | null;
    sourceLink?: string | null;
    topicGuess?: string | null;
  };
  const now = new Date().toISOString();
  const data = await hasuraGraphqlRequest<{ insert_brain_items_one: BrainItemRow | null }>(
    `
      mutation GraphqlCreateBrainItem(
        $userId: uuid!
        $type: brain_item_type!
        $contentType: String
        $title: String!
        $rawContent: String!
        $sourceApp: String
        $sourceLink: String
        $topicGuess: String
        $now: timestamptz!
      ) {
        insert_brain_items_one(
          object: {
            user_id: $userId
            type: $type
            content_type: $contentType
            title: $title
            raw_content: $rawContent
            source_app: $sourceApp
            source_link: $sourceLink
            topic_guess: $topicGuess
            status: active
            created_at: $now
            updated_at: $now
          }
        ) {
          id
          user_id
          type
          content_type
          title
          raw_content
          source_app
          source_link
          topic_guess
          status
          created_at
          updated_at
        }
      }
    `,
    {
      userId,
      type: input.type,
      contentType: input.contentType ?? "text",
      title: input.title,
      rawContent: input.rawContent,
      sourceApp: input.sourceApp ?? null,
      sourceLink: input.sourceLink ?? null,
      topicGuess: input.topicGuess ?? null,
      now
    }
  );
  if (!data.insert_brain_items_one) {
    throw new Error("Brain item create failed");
  }
  return mapBrainItem(data.insert_brain_items_one) as T;
}

export async function updateBrainItemGraphql<T>(itemId: string, payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  const updates = payload as {
    title?: string;
    rawContent?: string;
    status?: "active" | "archived";
  };
  const data = await hasuraGraphqlRequest<{ update_brain_items: { returning: BrainItemRow[] } }>(
    `
      mutation GraphqlUpdateBrainItem($itemId: uuid!, $userId: uuid!, $patch: brain_items_set_input!) {
        update_brain_items(where: { id: { _eq: $itemId }, user_id: { _eq: $userId } }, _set: $patch) {
          returning {
            id
            user_id
            type
            content_type
            title
            raw_content
            source_app
            source_link
            topic_guess
            status
            created_at
            updated_at
          }
        }
      }
    `,
    {
      itemId,
      userId,
      patch: {
        title: updates.title,
        raw_content: updates.rawContent,
        status: updates.status,
        updated_at: new Date().toISOString()
      }
    }
  );
  const item = data.update_brain_items.returning[0];
  if (!item) {
    throw new Error("Brain item not found");
  }
  return mapBrainItem(item) as T;
}

export async function listBrainItemArtifactsGraphql<T>(
  itemId: string,
  type?: "summary" | "classification" | "relation" | "feed_card"
): Promise<T> {
  const userId = requireCurrentUserId();
  await assertItemAccess(itemId, userId);
  const data = type
    ? await hasuraGraphqlRequest<{ item_artifacts: ArtifactRow[] }>(
        `
          query GraphqlListArtifactsByType($itemId: uuid!, $type: artifact_type!) {
            item_artifacts(
              where: { item_id: { _eq: $itemId }, type: { _eq: $type } }
              order_by: [{ created_at: desc }, { id: desc }]
            ) {
              id
              item_id
              type
              payload
              confidence
              created_at
            }
          }
        `,
        { itemId, type }
      )
    : await hasuraGraphqlRequest<{ item_artifacts: ArtifactRow[] }>(
        `
          query GraphqlListArtifacts($itemId: uuid!) {
            item_artifacts(
              where: { item_id: { _eq: $itemId } }
              order_by: [{ created_at: desc }, { id: desc }]
            ) {
              id
              item_id
              type
              payload
              confidence
              created_at
            }
          }
        `,
        { itemId }
      );
  return data.item_artifacts.map(mapArtifact) as T;
}

export async function listThreadsByTargetGraphql<T>(itemId: string): Promise<T> {
  const userId = requireCurrentUserId();
  await assertItemAccess(itemId, userId);
  const data = await hasuraGraphqlRequest<{ item_threads: ThreadRow[] }>(
    `
      query GraphqlListThreadsByTarget($itemId: uuid!) {
        item_threads(where: { target_item_id: { _eq: $itemId } }, order_by: [{ created_at: desc }, { id: asc }]) {
          id
          target_item_id
          kind
          created_at
          updated_at
        }
      }
    `,
    { itemId }
  );
  return data.item_threads.map(mapThread) as T;
}

export async function createThreadGraphql<T>(payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  const input = payload as { targetItemId: string; kind: "item_comment" | "item_chat" };
  await assertItemAccess(input.targetItemId, userId);
  const now = new Date().toISOString();
  const data = await hasuraGraphqlRequest<{ insert_item_threads_one: ThreadRow | null }>(
    `
      mutation GraphqlCreateThread($targetItemId: uuid!, $kind: thread_kind!, $now: timestamptz!) {
        insert_item_threads_one(
          object: {
            target_item_id: $targetItemId
            kind: $kind
            created_at: $now
            updated_at: $now
          }
        ) {
          id
          target_item_id
          kind
          created_at
          updated_at
        }
      }
    `,
    {
      targetItemId: input.targetItemId,
      kind: input.kind,
      now
    }
  );
  if (!data.insert_item_threads_one) {
    throw new Error("Thread create failed");
  }
  return mapThread(data.insert_item_threads_one) as T;
}

export async function listThreadMessagesGraphql<T>(threadId: string): Promise<T> {
  const userId = requireCurrentUserId();
  await getThreadForUser(threadId, userId);
  const data = await hasuraGraphqlRequest<{ thread_messages: MessageRow[] }>(
    `
      query GraphqlListThreadMessages($threadId: uuid!) {
        thread_messages(
          where: { thread_id: { _eq: $threadId } }
          order_by: [{ created_at: asc }, { id: asc }]
        ) {
          id
          thread_id
          role
          content
          created_at
        }
      }
    `,
    { threadId }
  );
  return data.thread_messages.map(mapMessage) as T;
}

export async function sendMessageGraphql<T>(payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  const input = payload as {
    threadId: string;
    role: "user" | "assistant" | "system";
    content: string;
  };
  await getThreadForUser(input.threadId, userId);
  const data = await hasuraGraphqlRequest<{ insert_thread_messages_one: MessageRow | null }>(
    `
      mutation GraphqlCreateMessage($threadId: uuid!, $role: message_role!, $content: String!, $createdAt: timestamptz!) {
        insert_thread_messages_one(
          object: {
            thread_id: $threadId
            role: $role
            content: $content
            created_at: $createdAt
          }
        ) {
          id
          thread_id
          role
          content
          created_at
        }
      }
    `,
    {
      threadId: input.threadId,
      role: input.role,
      content: input.content,
      createdAt: new Date().toISOString()
    }
  );
  if (!data.insert_thread_messages_one) {
    throw new Error("Message create failed");
  }
  return mapMessage(data.insert_thread_messages_one) as T;
}

export async function listTasksGraphql<T>(query: TaskListQuery = {}): Promise<T> {
  const userId = requireCurrentUserId();
  const scopedUserId = query.userId && query.userId === userId ? query.userId : userId;
  const data = query.status
    ? await hasuraGraphqlRequest<{ tasks: TaskRow[] }>(
        `
          query GraphqlListTasksByStatus($userId: uuid!, $status: task_status!) {
            tasks(
              where: { user_id: { _eq: $userId }, status: { _eq: $status } }
              order_by: [{ created_at: desc }, { id: asc }]
            ) {
              id
              user_id
              source_item_id
              source_message_id
              title
              status
              created_at
              updated_at
            }
          }
        `,
        { userId: scopedUserId, status: query.status }
      )
    : await hasuraGraphqlRequest<{ tasks: TaskRow[] }>(
        `
          query GraphqlListTasks($userId: uuid!) {
            tasks(
              where: { user_id: { _eq: $userId } }
              order_by: [{ created_at: desc }, { id: asc }]
            ) {
              id
              user_id
              source_item_id
              source_message_id
              title
              status
              created_at
              updated_at
            }
          }
        `,
        { userId: scopedUserId }
      );
  return data.tasks.map(mapTask) as T;
}

export async function createTaskGraphql<T>(payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  const input = payload as {
    title: string;
    sourceItemId?: string | null;
    sourceMessageId?: string | null;
  };
  if (input.sourceItemId) {
    await assertItemAccess(input.sourceItemId, userId);
  }
  const now = new Date().toISOString();
  const data = await hasuraGraphqlRequest<{ insert_tasks_one: TaskRow | null }>(
    `
      mutation GraphqlCreateTask(
        $userId: uuid!
        $title: String!
        $sourceItemId: uuid
        $sourceMessageId: uuid
        $createdAt: timestamptz!
      ) {
        insert_tasks_one(
          object: {
            user_id: $userId
            source_item_id: $sourceItemId
            source_message_id: $sourceMessageId
            title: $title
            status: todo
            created_at: $createdAt
            updated_at: $createdAt
          }
        ) {
          id
          user_id
          source_item_id
          source_message_id
          title
          status
          created_at
          updated_at
        }
      }
    `,
    {
      userId,
      title: input.title,
      sourceItemId: input.sourceItemId ?? null,
      sourceMessageId: input.sourceMessageId ?? null,
      createdAt: now
    }
  );
  if (!data.insert_tasks_one) {
    throw new Error("Task create failed");
  }
  return mapTask(data.insert_tasks_one) as T;
}

export async function updateTaskGraphql<T>(taskId: string, payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  await getTaskForUser(taskId, userId);
  const updates = payload as {
    title?: string;
    status?: "todo" | "in_progress" | "done";
    sourceItemId?: string | null;
    sourceMessageId?: string | null;
  };
  if (updates.sourceItemId) {
    await assertItemAccess(updates.sourceItemId, userId);
  }
  const data = await hasuraGraphqlRequest<{ update_tasks: { returning: TaskRow[] } }>(
    `
      mutation GraphqlUpdateTask($taskId: uuid!, $userId: uuid!, $patch: tasks_set_input!) {
        update_tasks(where: { id: { _eq: $taskId }, user_id: { _eq: $userId } }, _set: $patch) {
          returning {
            id
            user_id
            source_item_id
            source_message_id
            title
            status
            created_at
            updated_at
          }
        }
      }
    `,
    {
      taskId,
      userId,
      patch: {
        title: updates.title,
        status: updates.status,
        source_item_id: updates.sourceItemId,
        source_message_id: updates.sourceMessageId,
        updated_at: new Date().toISOString()
      }
    }
  );
  const task = data.update_tasks.returning[0];
  if (!task) {
    throw new Error("Task not found");
  }
  return mapTask(task) as T;
}

export async function listSessionsGraphql<T>(query: SessionListQuery = {}): Promise<T> {
  const userId = requireCurrentUserId();
  const scopedUserId = query.userId && query.userId === userId ? query.userId : userId;

  if (query.taskId) {
    await getTaskForUser(query.taskId, scopedUserId);
  }

  const data = query.state
    ? query.taskId
      ? await hasuraGraphqlRequest<{ sessions: SessionRow[] }>(
          `
            query GraphqlListSessionsByStateAndTask($userId: uuid!, $state: session_state!, $taskId: uuid!) {
              sessions(
                where: {
                  user_id: { _eq: $userId }
                  state: { _eq: $state }
                  task_id: { _eq: $taskId }
                }
                order_by: [{ started_at: desc }, { id: desc }]
              ) {
                id
                task_id
                state
                started_at
                ended_at
              }
            }
          `,
          { userId: scopedUserId, state: query.state, taskId: query.taskId }
        )
      : await hasuraGraphqlRequest<{ sessions: SessionRow[] }>(
          `
            query GraphqlListSessionsByState($userId: uuid!, $state: session_state!) {
              sessions(
                where: {
                  user_id: { _eq: $userId }
                  state: { _eq: $state }
                }
                order_by: [{ started_at: desc }, { id: desc }]
              ) {
                id
                task_id
                state
                started_at
                ended_at
              }
            }
          `,
          { userId: scopedUserId, state: query.state }
        )
    : query.taskId
      ? await hasuraGraphqlRequest<{ sessions: SessionRow[] }>(
          `
            query GraphqlListSessionsByTask($userId: uuid!, $taskId: uuid!) {
              sessions(
                where: {
                  user_id: { _eq: $userId }
                  task_id: { _eq: $taskId }
                }
                order_by: [{ started_at: desc }, { id: desc }]
              ) {
                id
                task_id
                state
                started_at
                ended_at
              }
            }
          `,
          { userId: scopedUserId, taskId: query.taskId }
        )
      : await hasuraGraphqlRequest<{ sessions: SessionRow[] }>(
          `
            query GraphqlListSessionsByUser($userId: uuid!) {
              sessions(
                where: {
                  user_id: { _eq: $userId }
                }
                order_by: [{ started_at: desc }, { id: desc }]
              ) {
                id
                task_id
                state
                started_at
                ended_at
              }
            }
          `,
          { userId: scopedUserId }
        );

  return (data.sessions ?? []).map(mapSession) as T;
}

export async function getUserPreferenceGraphql<T>(requestedUserId: string): Promise<T> {
  const userId = requireCurrentUserId();
  if (requestedUserId !== userId) {
    throw new Error("Cannot access preferences for another user");
  }
  const data = await hasuraGraphqlRequest<{ user_preferences_by_pk: PreferenceRow | null }>(
    `
      query GraphqlGetUserPreference($userId: uuid!) {
        user_preferences_by_pk(user_id: $userId) {
          user_id
          default_lens
          clean_focus_mode
          founder_mode
          render_mode
          ai_summary_mode
          feed_density
          resurfacing_intensity
          updated_at
        }
      }
    `,
    { userId }
  );
  return (data.user_preferences_by_pk ? mapPreference(data.user_preferences_by_pk) : defaultPreference(userId)) as T;
}

export async function getUserPreferenceMeGraphql<T>(): Promise<T> {
  const userId = requireCurrentUserId();
  return getUserPreferenceGraphql<T>(userId);
}

export async function updateUserPreferenceGraphql<T>(requestedUserId: string, payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  if (requestedUserId !== userId) {
    throw new Error("Cannot update preferences for another user");
  }

  const updates = payload as UpdatePreferenceInput;
  const current = await getUserPreferenceGraphql<ReturnType<typeof defaultPreference>>(userId);
  const merged = {
    ...current,
    ...updates
  };
  const now = new Date().toISOString();
  const data = await hasuraGraphqlRequest<{ insert_user_preferences_one: PreferenceRow | null }>(
    `
      mutation GraphqlUpsertUserPreference(
        $userId: uuid!
        $defaultLens: String
        $cleanFocusMode: Boolean
        $founderMode: Boolean
        $renderMode: String
        $aiSummaryMode: String
        $feedDensity: String
        $resurfacingIntensity: String
        $updatedAt: timestamptz!
      ) {
        insert_user_preferences_one(
          object: {
            user_id: $userId
            default_lens: $defaultLens
            clean_focus_mode: $cleanFocusMode
            founder_mode: $founderMode
            render_mode: $renderMode
            ai_summary_mode: $aiSummaryMode
            feed_density: $feedDensity
            resurfacing_intensity: $resurfacingIntensity
            updated_at: $updatedAt
          }
          on_conflict: {
            constraint: user_preferences_pkey
            update_columns: [
              default_lens
              clean_focus_mode
              founder_mode
              render_mode
              ai_summary_mode
              feed_density
              resurfacing_intensity
              updated_at
            ]
          }
        ) {
          user_id
          default_lens
          clean_focus_mode
          founder_mode
          render_mode
          ai_summary_mode
          feed_density
          resurfacing_intensity
          updated_at
        }
      }
    `,
    {
      userId,
      defaultLens: merged.defaultLens,
      cleanFocusMode: merged.cleanFocusMode,
      founderMode: merged.founderMode,
      renderMode: merged.renderMode,
      aiSummaryMode: merged.aiSummaryMode,
      feedDensity: merged.feedDensity,
      resurfacingIntensity: merged.resurfacingIntensity,
      updatedAt: now
    }
  );
  if (!data.insert_user_preferences_one) {
    throw new Error("Preference update failed");
  }
  return mapPreference(data.insert_user_preferences_one) as T;
}

export async function updateUserPreferenceMeGraphql<T>(payload: unknown): Promise<T> {
  const userId = requireCurrentUserId();
  return updateUserPreferenceGraphql<T>(userId, payload);
}
