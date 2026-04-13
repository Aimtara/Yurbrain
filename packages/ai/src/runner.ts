import type { AiEnvelope } from "./validate";

export type AiRunnerInput = {
  task: "summarize" | "classify" | "query";
  content: string;
  timeoutMs?: number;
};

export type AiRunner = {
  run: (input: AiRunnerInput) => Promise<unknown>;
};

const DEFAULT_TIMEOUT_MS = 800;

function createDeterministicProvider(): AiRunner {
  return {
    async run(input) {
      if (input.content.includes("[force-invalid]")) {
        return { invalid: true };
      }

      if (input.content.includes("[force-timeout]")) {
        await new Promise((resolve) => setTimeout(resolve, (input.timeoutMs ?? DEFAULT_TIMEOUT_MS) + 25));
      }

      const base: AiEnvelope = {
        content: `${input.task.toUpperCase()}: ${input.content.slice(0, 120)}`,
        confidence: 0.76,
        metadata: { source: "deterministic_provider" }
      };

      return base;
    }
  };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("AI runner timed out")), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export async function runAiTask(input: AiRunnerInput, provider: AiRunner = createDeterministicProvider()): Promise<unknown> {
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return withTimeout(provider.run(input), timeoutMs);
}
