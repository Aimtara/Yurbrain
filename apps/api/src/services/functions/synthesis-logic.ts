import type { DbRepository } from "@yurbrain/db";
import { synthesizeFromItems } from "../ai/synthesis";
import { buildSummarizeProgressWithLlm, type SummarizeProgressResult } from "./summarize-progress-llm";
import { buildWhatShouldIDoNextWithLlm, type WhatShouldIDoNextResult } from "./what-should-i-do-next-llm";
import type { FastifyBaseLogger } from "fastify";

export type SynthesisMode = "cluster_summary" | "next_step";

export async function runSynthesisLogic(
  repo: DbRepository,
  itemIds: string[],
  mode: SynthesisMode
): Promise<{
  summary: string;
  repeatedIdeas?: string[];
  suggestedNextAction: string;
  reason: string;
}> {
  return synthesizeFromItems(repo, itemIds, mode);
}

export async function buildSummarizeProgress(
  repo: DbRepository,
  itemIds: string[],
  options: {
    log?: FastifyBaseLogger;
    correlationId?: string;
    timeoutMs?: number;
  } = {}
): Promise<SummarizeProgressResult> {
  return buildSummarizeProgressWithLlm(repo, itemIds, options);
}

export async function buildWhatShouldIDoNext(
  repo: DbRepository,
  itemIds: string[],
  options: {
    log?: FastifyBaseLogger;
    correlationId?: string;
    timeoutMs?: number;
  } = {}
): Promise<WhatShouldIDoNextResult> {
  return buildWhatShouldIDoNextWithLlm(repo, itemIds, options);
}
