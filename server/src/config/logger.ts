import pino from "pino";
import { env } from "./env.js";

// Structured logging. Pretty output in dev; JSON in prod. Never log full
// SDP/ICE payloads, chat text, or participant PII — only ids and counts.
export const logger = pino({
  level: env.isProd ? "info" : "debug",
  base: undefined, // drop pid/hostname noise
  transport: env.isProd
    ? undefined
    : { target: "pino-pretty", options: { colorize: true, translateTime: "SYS:HH:MM:ss" } },
});
