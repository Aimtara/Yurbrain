import type { DbRepository } from "@yurbrain/db";
import { synthesizeFromItems } from "../ai/synthesis";

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
  itemIds: string[]
) {
  return runSynthesisLogic(repo, itemIds, "cluster_summary");
}

export async function buildWhatShouldIDoNext(
  repo: DbRepository,
  itemIds: string[]
) {
  return runSynthesisLogic(repo, itemIds, "next_step");
}
