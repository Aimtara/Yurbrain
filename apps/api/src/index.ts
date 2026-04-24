import { app } from "./server";

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
  } catch (error) {
    if (error instanceof Error) {
      app.log.error({ event: "api_startup_failed", errorName: error.name }, "api startup failed");
    } else {
      app.log.error({ event: "api_startup_failed", errorName: "UnknownError" }, "api startup failed");
    }
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}
