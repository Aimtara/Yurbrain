import { app } from "./server";

const start = async () => {
  try {
    await app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3001) });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

if (process.env.NODE_ENV !== "test") {
  start();
}
