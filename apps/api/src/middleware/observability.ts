import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

const CORRELATION_HEADER = "x-correlation-id";
const REQUEST_START_SYMBOL = Symbol("requestStartMs");

type ObservabilityRequest = FastifyRequest & {
  [REQUEST_START_SYMBOL]?: number;
  correlationId?: string;
};

export function registerObservability(app: FastifyInstance) {
  app.addHook("onRequest", async (request: ObservabilityRequest, reply: FastifyReply) => {
    const incomingRequestId = (request.headers["x-request-id"] as string | undefined)?.trim();
    const incoming = request.headers[CORRELATION_HEADER] as string | undefined;
    const correlationId = incoming?.trim() || randomUUID();
    request.correlationId = correlationId;
    request[REQUEST_START_SYMBOL] = Date.now();
    reply.header("x-request-id", incomingRequestId || request.id);
    reply.header(CORRELATION_HEADER, correlationId);
  });

  app.addHook("onResponse", async (request: ObservabilityRequest, reply: FastifyReply) => {
    const startedAt = request[REQUEST_START_SYMBOL] ?? Date.now();
    const durationMs = Date.now() - startedAt;
    request.log.info(
      {
        event: "http_request_complete",
        correlationId: request.correlationId,
        method: request.method,
        url: sanitizeUrlForLogging(request.url),
        statusCode: reply.statusCode,
        durationMs
      },
      "request completed"
    );
  });
}

export function buildErrorEnvelope(
  request: FastifyRequest & { correlationId?: string },
  statusCode: number,
  message: string,
  details?: unknown,
  code?: string
) {
  const envelopeError: {
    code?: string;
    message: string;
    statusCode: number;
    correlationId?: string;
    details?: unknown;
  } = {
    message,
    statusCode,
    correlationId: request.correlationId,
    details
  };
  if (code) {
    envelopeError.code = code;
  }
  return {
    error: envelopeError
  };
}

export function sanitizeUrlForLogging(url: string): string {
  if (!url) return "/";
  const pathname = url.split("?")[0];
  if (!pathname || pathname.trim().length === 0) return "/";
  return pathname;
}

function resolveRequestId(request: FastifyRequest): string {
  const requestIdHeader = request.headers["x-request-id"];
  if (typeof requestIdHeader === "string" && requestIdHeader.trim().length > 0) {
    return requestIdHeader.trim();
  }
  return request.id;
}

export function sendSafeErrorResponse(
  request: FastifyRequest & { correlationId?: string },
  reply: FastifyReply,
  input: {
    statusCode: number;
    message: string;
    details?: unknown;
    code?: string;
    extra?: Record<string, unknown>;
  }
) {
  const requestId = resolveRequestId(request);
  reply.header("x-request-id", requestId);
  const envelope = buildErrorEnvelope(request, input.statusCode, input.message, input.details, input.code);
  return reply.code(input.statusCode).send({
    ...envelope,
    message: input.message,
    requestId,
    ...(input.extra ?? {})
  });
}
