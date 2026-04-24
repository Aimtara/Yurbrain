export type NhostErrorCode =
  | "NHOST_NETWORK_ERROR"
  | "NHOST_HTTP_ERROR"
  | "NHOST_GRAPHQL_ERROR"
  | "NHOST_CONFIG_ERROR"
  | "NHOST_UNKNOWN_ERROR";

export type NhostErrorContext = {
  code: NhostErrorCode;
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
  operation?: string;
};

export class NhostRequestError extends Error implements NhostErrorContext {
  code: NhostErrorCode;
  statusCode?: number;
  retryable: boolean;
  userMessage: string;
  operation?: string;

  constructor(message: string, context: NhostErrorContext) {
    super(message);
    this.name = "NhostRequestError";
    this.code = context.code;
    this.statusCode = context.statusCode;
    this.retryable = context.retryable;
    this.userMessage = context.userMessage;
    this.operation = context.operation;
  }
}

function buildUserMessageFromStatus(statusCode?: number): string {
  if (statusCode === 401 || statusCode === 403) {
    return "Authentication failed. Please sign in again.";
  }
  if (statusCode === 404) {
    return "The requested data could not be found.";
  }
  if (statusCode === 408 || statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504) {
    return "The service is temporarily unavailable. Please try again.";
  }
  return "Unable to complete this request right now.";
}

function shouldRetryByStatus(statusCode?: number): boolean {
  return statusCode === 408 || statusCode === 429 || statusCode === 502 || statusCode === 503 || statusCode === 504;
}

function extractErrorMessage(caught: unknown): string | null {
  if (caught instanceof Error && caught.message.trim().length > 0) {
    return caught.message;
  }
  if (typeof caught === "object" && caught && "body" in caught) {
    const body = (caught as { body?: { message?: unknown } }).body;
    if (typeof body?.message === "string" && body.message.trim().length > 0) {
      return body.message;
    }
  }
  if (typeof caught === "string" && caught.trim().length > 0) {
    return caught;
  }
  return null;
}

export function createNhostRequestError(input: {
  code: NhostErrorCode;
  message: string;
  statusCode?: number;
  operation?: string;
  retryable?: boolean;
  userMessage?: string;
}): NhostRequestError {
  const userMessage = input.userMessage ?? buildUserMessageFromStatus(input.statusCode);
  const retryable = input.retryable ?? shouldRetryByStatus(input.statusCode);
  return new NhostRequestError(input.message, {
    code: input.code,
    statusCode: input.statusCode,
    retryable,
    userMessage,
    operation: input.operation
  });
}

export function toNhostRequestError(
  caught: unknown,
  fallback: {
    message: string;
    code?: NhostErrorCode;
    statusCode?: number;
    operation?: string;
    retryable?: boolean;
    userMessage?: string;
  }
): NhostRequestError {
  if (caught instanceof NhostRequestError) {
    return caught;
  }
  return createNhostRequestError({
    code: fallback.code ?? "NHOST_UNKNOWN_ERROR",
    message: fallback.message,
    statusCode: fallback.statusCode,
    operation: fallback.operation,
    retryable: fallback.retryable,
    userMessage: fallback.userMessage
  });
}

export function toNhostErrorLogContext(caught: unknown) {
  const parsed = toNhostRequestError(caught, {
    code: "NHOST_UNKNOWN_ERROR",
    message: "Unknown Nhost error",
    userMessage: "Unable to complete this request right now."
  });
  return {
    nhostErrorCode: parsed.code,
    statusCode: parsed.statusCode,
    retryable: parsed.retryable,
    operation: parsed.operation
  };
}

export function toUserSafeNhostAuthMessage(caught: unknown, fallback: string): string {
  if (caught instanceof NhostRequestError) {
    return caught.userMessage;
  }

  const raw = (extractErrorMessage(caught) ?? "").toLowerCase();
  if (!raw) return fallback;

  if (raw.includes("invalid email") || raw.includes("invalid password") || raw.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (raw.includes("already") && raw.includes("exists")) {
    return "An account with this email already exists.";
  }
  if (raw.includes("password") && (raw.includes("weak") || raw.includes("short") || raw.includes("minimum"))) {
    return "Password does not meet requirements.";
  }
  if (raw.includes("network") || raw.includes("fetch") || raw.includes("timeout")) {
    return "Network issue. Check your connection and try again.";
  }

  return fallback;
}
