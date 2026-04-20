import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import { encodeGroundedAiContext } from "@yurbrain/ai";
import type { AppState } from "../../state";
import { buildItemExecutionContext } from "./execution-context";
import { resolveAiEnvelope } from "./shared";

export async function queryItemAssistant(
  state: AppState,
  input: { threadId: string; question: string; timeoutMs?: number },
  log?: FastifyBaseLogger,
  correlationId?: string
) {
  const thread = await state.repo.getThreadById(input.threadId);
  if (!thread) {
    log?.warn({ event: "query_thread_not_found", threadId: input.threadId, correlationId }, "thread missing for query");
    return null;
  }

  const userMessage = {
    id: randomUUID(),
    threadId: input.threadId,
    role: "user" as const,
    content: input.question,
    createdAt: new Date().toISOString()
  };
  const asksForNextMove = /what should i do next|what next|next step|do next|next move/i.test(input.question.toLowerCase());
  const executionContext = await buildItemExecutionContext(state, thread.targetItemId);
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "query",
    content: encodeGroundedAiContext({
      primaryText: input.question,
      context: {
        intent: asksForNextMove ? "next_action" : "context_query",
        itemTitle: executionContext.itemTitle,
        changed: executionContext.changed,
        done: executionContext.done,
        blocked: executionContext.blocked,
        recommendation: executionContext.recommendation,
        reason: executionContext.reason,
        nextMove: executionContext.nextMove
      }
    }),
    timeoutMs: input.timeoutMs,
    log,
    correlationId
  });
  const assistantMessage = {
    id: randomUUID(),
    threadId: input.threadId,
    role: "assistant" as const,
    content: ai.content,
    createdAt: new Date().toISOString()
  };

  await state.repo.createMessage(userMessage);
  await state.repo.createMessage(assistantMessage);
  log?.info({ event: "query_messages_persisted", threadId: input.threadId, fallbackUsed, correlationId }, "query response persisted");

  return {
    threadId: input.threadId,
    userMessage,
    message: assistantMessage,
    ai,
    fallbackUsed,
    fallbackReason
  };
}
