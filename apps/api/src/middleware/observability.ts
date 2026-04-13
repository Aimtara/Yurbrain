import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";

declare module "fastify" {
  interface FastifyRequest {
    requestId: string;
    requestStartNs: bigint;
  }
}

export function registerObservability(app: FastifyInstance) {
  app.addHook("onRequest", async (request, reply) => {
    request.requestId = typeof request.headers["x-request-id"] === "string" ? request.headers["x-request-id"] : randomUUID();
    request.requestStartNs = process.hrtime.bigint();
    reply.header("x-request-id", request.requestId);
  });

  app.addHook("onResponse", async (request, reply) => {
    const durationMs = Number(process.hrtime.bigint() - request.requestStartNs) / 1_000_000;
    request.log.info(
      {
        requestId: request.requestId,
        statusCode: reply.statusCode,
        durationMs
      },
      "request_completed"
    );
  });
}
