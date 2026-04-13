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
    const incoming = request.headers[CORRELATION_HEADER] as string | undefined;
    const correlationId = incoming?.trim() || randomUUID();
    request.correlationId = correlationId;
    request[REQUEST_START_SYMBOL] = Date.now();
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
        url: request.url,
        statusCode: reply.statusCode,
        durationMs
      },
      "request completed"
    );
  });
}

export function buildErrorEnvelope(request: ObservabilityRequest, statusCode: number, message: string, details?: unknown) {
  return {
    error: {
      message,
      statusCode,
      correlationId: request.correlationId,
      details
    }
  };
}
