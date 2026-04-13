import { randomUUID } from "node:crypto";
import type { FastifyBaseLogger } from "fastify";
import type { AppState } from "../../state";
import { resolveAiEnvelope } from "./shared";

export async function queryItemAssistant(
  state: AppState,
  input: { threadId: string; question: string; timeoutMs?: number },
  log?: FastifyBaseLogger,
  correlationId?: string
) {
  const thread = state.threads.get(input.threadId);
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
  const { ai, fallbackUsed, fallbackReason } = await resolveAiEnvelope({
    task: "query",
    content: input.question,
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

  state.messages.set(input.threadId, [...(state.messages.get(input.threadId) ?? []), userMessage, assistantMessage]);
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
