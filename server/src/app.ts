import http from "node:http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { RoomStore } from "./state/RoomStore.js";
import { RoomService } from "./services/roomService.js";
import { buildRoutes } from "./http/routes/index.js";
import { registerSocketHandlers } from "./socket/index.js";

// Build the Express app + HTTP server + Socket.io, wire all handlers, and return
// them. `index.ts` constructs this and listens; tests import it without a port.
export function createApp() {
  const store = new RoomStore();
  const service = new RoomService(store, env.maxPerRoom);

  const app = express();
  // Behind nginx we may trust N proxy hops; 0 (default) trusts none, so clients
  // can't spoof X-Forwarded-For.
  app.set("trust proxy", env.trustProxy);
  app.use(helmet({ hsts: env.isProd }));
  app.use(cors({ origin: env.corsOrigin }));
  app.use(pinoHttp({ logger }));
  app.use(buildRoutes(store));

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: env.corsOrigin },
    // Large ICE/SDP payloads travel over signaling; keep bounded.
    maxHttpBufferSize: 1e6,
  });

  registerSocketHandlers(io, service, logger);

  return { app, server, io, store, service };
}
