import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";

// Composition root: build the app, start listening, wire graceful shutdown.
const { server, io } = createApp();

server.listen(env.port, "0.0.0.0", () => {
  logger.info({ port: env.port, env: env.nodeEnv }, "signaling server listening");
});

let shuttingDown = false;
function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "shutting down");

  // Stop accepting new sockets, let existing ones close, then exit.
  io.close();
  server.close(() => {
    logger.info("closed cleanly");
    process.exit(0);
  });

  // Fallback if connections don't drain in time.
  setTimeout(() => {
    logger.warn("forced exit after timeout");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
