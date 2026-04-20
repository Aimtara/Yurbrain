import { useCallback } from "react";
import type { YurbrainClient } from "@yurbrain/client";

import type { BrainItemDto, ContinuityContext, ItemArtifactDto, MessageDto, ThreadDto } from "../shared/types";
import { deriveArtifactHistory } from "./item-detail-model";

type UseItemDetailControllerInput = {
  yurbrainClient: YurbrainClient;
  selectedItem: BrainItemDto | null;
  selectedItemId: string;
  chatThreadId: string;
  relatedItemIds: string[];
  derivedItemContinuity: { nextStep?: string; blockedState?: string };
  setCommentThreadId: (threadId: string) => void;
  setChatThreadId: (threadId: string) => void;
  setCommentMessages: (updater: MessageDto[] | ((current: MessageDto[]) => MessageDto[])) => void;
  setChatMessages: (updater: MessageDto[] | ((current: MessageDto[]) => MessageDto[])) => void;
  setItemActionNotice: (notice: string) => void;
  setItemContextLoading: (loading: boolean) => void;
  setChatError: (error: string) => void;
  setChatFallbackNotice: (notice: string) => void;
  setLastQuestion: (question: string) => void;
  setLastAction: (action: string) => void;
  setArtifactHistoryByItem: (
    updater:
      | Record<string, { summary: string[]; classification: string[] }>
      | ((current: Record<string, { summary: string[]; classification: string[] }>) => Record<string, { summary: string[]; classification: string[] }>)
  ) => void;
  setSelectedItemId: (itemId: string) => void;
  setSelectedContinuity: (continuity: ContinuityContext | null) => void;
  runConvert: (input: { itemId: string; content: string; sourceMessageId?: string }) => Promise<unknown>;
};

export function useItemDetailController({
  yurbrainClient,
  selectedItem,
  selectedItemId,
  chatThreadId,
  relatedItemIds,
  derivedItemContinuity,
  setCommentThreadId,
  setChatThreadId,
  setCommentMessages,
  setChatMessages,
  setItemActionNotice,
  setItemContextLoading,
  setChatError,
  setChatFallbackNotice,
  setLastQuestion,
  setLastAction,
  setArtifactHistoryByItem,
  setSelectedItemId,
  setSelectedContinuity,
  runConvert
}: UseItemDetailControllerInput) {
  const syncItemArtifacts = useCallback(
    (itemId: string, artifacts: ItemArtifactDto[]) => {
      const { summary, classification } = deriveArtifactHistory(artifacts);
      setArtifactHistoryByItem((current) => ({
        ...current,
        [itemId]: { summary, classification }
      }));
    },
    [setArtifactHistoryByItem]
  );

  const loadSelectedItemContext = useCallback(
    async (itemId: string) => {
      setItemContextLoading(true);
      setItemActionNotice("");
      try {
        const context = await yurbrainClient.getItemContext<{
          threads: ThreadDto[];
          artifacts: ItemArtifactDto[];
          commentMessages: MessageDto[];
          chatMessages: MessageDto[];
          relatedItemIds: string[];
        }>(itemId);
        const { threads, artifacts, commentMessages, chatMessages } = context;
        const commentThread = threads.find((thread) => thread.kind === "item_comment") ?? null;
        const chatThread = threads.find((thread) => thread.kind === "item_chat") ?? null;
        setCommentThreadId(commentThread?.id ?? "");
        setChatThreadId(chatThread?.id ?? "");

        setCommentMessages(commentMessages.filter((message) => message.role === "user"));
        setChatMessages(chatMessages);

        syncItemArtifacts(itemId, artifacts);
        setChatError("");
      } catch {
        setChatError("Could not load continuity context for this item.");
        setCommentMessages([]);
        setChatMessages([]);
      } finally {
        setItemContextLoading(false);
      }
    },
    [setChatError, setChatMessages, setChatThreadId, setCommentMessages, setCommentThreadId, setItemActionNotice, setItemContextLoading, syncItemArtifacts]
  );

  const ensureThreadForItem = useCallback(
    async (itemId: string, kind: "item_comment" | "item_chat") => {
      const created = await yurbrainClient.ensureItemThread(itemId, kind);
      if (itemId === selectedItemId) {
        if (kind === "item_comment") setCommentThreadId(created.id);
        if (kind === "item_chat") setChatThreadId(created.id);
      }
      return created.id;
    },
    [selectedItemId, setChatThreadId, setCommentThreadId]
  );

  const createComment = useCallback(
    async (itemId: string, content: string) => {
      const normalized = content.trim();
      if (!normalized) return null;
      const threadId = await ensureThreadForItem(itemId, "item_comment");
      const created = await yurbrainClient.addThreadMessage<MessageDto>({ threadId, role: "user", content: normalized });
      if (itemId === selectedItemId) {
        setCommentMessages((current) => [...current, created]);
        setItemActionNotice("Comment added to continuity timeline.");
      }
      return created;
    },
    [ensureThreadForItem, selectedItemId, setCommentMessages, setItemActionNotice]
  );

  const runQuickAction = useCallback(
    async (action: "summarize_progress" | "next_step" | "classify" | "convert_to_task") => {
      if (!selectedItem) return;
      setLastAction(action);
      if (action === "convert_to_task") {
        await runConvert({ itemId: selectedItem.id, content: selectedItem.rawContent });
        return;
      }

      const synthesisItemIds = Array.from(new Set([selectedItem.id, ...relatedItemIds]));
      try {
        if (action === "summarize_progress") {
          const response = await yurbrainClient.summarizeProgress<{
            summary: string;
            repeatedIdeas?: string[];
            suggestedNextAction: string;
            reason: string;
          }>({ itemIds: synthesisItemIds });
          setArtifactHistoryByItem((current) => {
            const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
            return {
              ...current,
              [selectedItem.id]: { summary: [response.summary, ...existing.summary], classification: existing.classification }
            };
          });
          const repeatedIdeas = response.repeatedIdeas?.slice(0, 3).join(", ");
          setItemActionNotice(
            repeatedIdeas
              ? `Progress summary ready. Repeated ideas: ${repeatedIdeas}. Next: ${response.suggestedNextAction}`
              : `Progress summary ready. Next: ${response.suggestedNextAction}`
          );
        } else if (action === "next_step") {
          const response = await yurbrainClient.getNextStep<{
            summary: string;
            repeatedIdeas?: string[];
            suggestedNextAction: string;
            reason: string;
          }>({ itemIds: synthesisItemIds });
          setItemActionNotice(`Next step: ${response.suggestedNextAction} Reason: ${response.reason}`);
        } else {
          const response = await yurbrainClient.classifyBrainItem<{ ai: { content: string } }>({
            itemId: selectedItem.id,
            rawContent: selectedItem.rawContent
          });
          setArtifactHistoryByItem((current) => {
            const existing = current[selectedItem.id] ?? { summary: [], classification: [] };
            return {
              ...current,
              [selectedItem.id]: { summary: existing.summary, classification: [response.ai.content, ...existing.classification] }
            };
          });
          setItemActionNotice("Generated an updated framing for this item.");
        }
      } catch {
        setLastAction(`${action}_failed`);
      }
    },
    [relatedItemIds, runConvert, selectedItem, setArtifactHistoryByItem, setItemActionNotice, setLastAction]
  );

  const runAiQuery = useCallback(
    async (question: string) => {
      if (!selectedItem) return;
      setLastQuestion(question);
      setChatError("");
      try {
        const activeThreadId = await ensureThreadForItem(selectedItem.id, "item_chat");
        const response = await yurbrainClient.queryBrainItemThread<{ userMessage: MessageDto; message: MessageDto; fallbackUsed: boolean }>({
          threadId: activeThreadId,
          question
        });
        const continuityThreadId = await ensureThreadForItem(selectedItem.id, "item_comment");
        await Promise.all([
          yurbrainClient.addThreadMessage<MessageDto>({ threadId: continuityThreadId, role: "user", content: response.userMessage.content }),
          yurbrainClient.addThreadMessage<MessageDto>({
            threadId: continuityThreadId,
            role: "assistant",
            content: response.message.content
          })
        ]);
        setChatMessages((current) => [...current, response.userMessage, response.message]);
        setCommentMessages((current) => [
          ...current,
          {
            ...response.userMessage,
            threadId: continuityThreadId
          },
          {
            ...response.message,
            threadId: continuityThreadId
          }
        ]);
        setChatFallbackNotice(response.fallbackUsed ? "AI fallback used for this response." : "");
        setItemActionNotice("Asked Yurbrain in-context.");
      } catch {
        setChatError("Could not reach AI query. Retry your last question.");
        setChatFallbackNotice("AI query unavailable; using local echo fallback.");
        const fallbackEntries: MessageDto[] = [
          { id: `local-user-${Date.now()}`, threadId: chatThreadId, role: "user", content: question, createdAt: new Date().toISOString() },
          {
            id: `local-assistant-${Date.now()}`,
            threadId: chatThreadId,
            role: "assistant",
            content: `Recommendation: ${derivedItemContinuity.nextStep ?? "Open this item and continue it now."} Reason: ${
              derivedItemContinuity.blockedState
                ? `It is currently blocked (${derivedItemContinuity.blockedState}).`
                : "It is the clearest active continuity loop."
            } Next move: ${derivedItemContinuity.nextStep ?? "Write one continuation note, then return to feed."}`,
            createdAt: new Date().toISOString()
          }
        ];
        setChatMessages((current) => [
          ...current,
          ...fallbackEntries
        ]);
        setCommentMessages((current) => [...current, ...fallbackEntries]);
        setItemActionNotice("Used local ask fallback.");
      }
    },
    [
      chatThreadId,
      derivedItemContinuity.blockedState,
      derivedItemContinuity.nextStep,
      ensureThreadForItem,
      selectedItem,
      setChatError,
      setChatFallbackNotice,
      setChatMessages,
      setItemActionNotice,
      setLastQuestion
    ]
  );

  const handleOpenRelatedItem = useCallback(
    (itemId: string) => {
      if (!itemId) return;
      setSelectedItemId(itemId);
      setSelectedContinuity(null);
      setItemActionNotice("Opened a related item to continue context.");
    },
    [setItemActionNotice, setSelectedContinuity, setSelectedItemId]
  );

  return {
    loadSelectedItemContext,
    createComment,
    runQuickAction,
    runAiQuery,
    handleOpenRelatedItem
  };
}
