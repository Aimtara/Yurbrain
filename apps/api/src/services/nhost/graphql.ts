import {
  executeServerGraphqlWithAdminSecret,
  toNhostErrorLogContext,
  toNhostRequestError,
  type NhostGraphqlVariables
} from "@yurbrain/nhost";

type ServerEnv = Record<string, string | undefined>;
type NhostRequestLogger = {
  info?: (meta: Record<string, unknown>, message: string) => void;
  warn?: (meta: Record<string, unknown>, message: string) => void;
  error?: (meta: Record<string, unknown>, message: string) => void;
};
type QueryNhostOptions = {
  logger?: NhostRequestLogger;
  correlationId?: string;
  operationName?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
};

export type { QueryNhostOptions };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function queryNhostAdminGraphql<T>(
  query: string,
  variables: NhostGraphqlVariables = {},
  env?: ServerEnv,
  options: QueryNhostOptions = {}
): Promise<T> {
  const logger = options.logger;
  const operationName = options.operationName ?? "queryNhostAdminGraphql";
  const correlationId = options.correlationId;
  const maxRetries = Math.max(0, options.maxRetries ?? 1);
  const initialBackoffMs = Math.max(100, options.initialBackoffMs ?? 250);
  const totalAttempts = maxRetries + 1;

  for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
    const startedAt = Date.now();
    logger?.info?.(
      {
        event: "nhost_admin_graphql_request_started",
        operationName,
        attempt,
        totalAttempts,
        correlationId
      },
      "nhost admin graphql request started"
    );
    try {
      const data = await executeServerGraphqlWithAdminSecret<T>(query, variables, env);
      logger?.info?.(
        {
          event: "nhost_admin_graphql_request_succeeded",
          operationName,
          attempt,
          totalAttempts,
          correlationId,
          durationMs: Date.now() - startedAt
        },
        "nhost admin graphql request succeeded"
      );
      return data;
    } catch (caught) {
      const parsed = toNhostRequestError(caught, {
        message: "[nhost] Admin GraphQL request failed",
        operation: operationName
      });
      const shouldRetry = parsed.retryable && attempt < totalAttempts;
      const baseLogContext = {
        event: "nhost_admin_graphql_request_failed",
        operationName,
        attempt,
        totalAttempts,
        correlationId,
        durationMs: Date.now() - startedAt,
        ...toNhostErrorLogContext(parsed)
      };

      if (shouldRetry) {
        const backoffMs = initialBackoffMs * 2 ** (attempt - 1);
        logger?.warn?.(
          {
            ...baseLogContext,
            backoffMs
          },
          "nhost admin graphql request failed; retrying"
        );
        await delay(backoffMs);
        continue;
      }

      logger?.error?.(baseLogContext, "nhost admin graphql request failed");
      throw parsed;
    }
  }

  throw toNhostRequestError(new Error("[nhost] Admin GraphQL request failed"), {
    message: "[nhost] Admin GraphQL request failed",
    operation: options.operationName ?? "queryNhostAdminGraphql"
  });
}

// Example server-side usage for privileged GraphQL access.
export async function getNhostGraphqlTypename(
  env?: ServerEnv
): Promise<string> {
  const data = await queryNhostAdminGraphql<{ __typename: string }>(
    "query ApiNhostHealth { __typename }",
    {},
    env,
    {
      operationName: "getNhostGraphqlTypename"
    }
  );
  return data.__typename;
}
