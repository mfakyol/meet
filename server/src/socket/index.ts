import type { Server } from "socket.io";
import type { Logger } from "pino";
import type { RoomService } from "../services/roomService.js";
import { RateLimiter } from "../services/rateLimiter.js";
import type { SocketContext } from "./context.js";
import { registerJoinHandler } from "./handlers/join.handler.js";
import { registerSignalHandler } from "./handlers/signal.handler.js";
import { registerStateHandler } from "./handlers/state.handler.js";
import { registerChatHandler } from "./handlers/chat.handler.js";
import { registerLeaveHandler } from "./handlers/leave.handler.js";

// Wire connection handling. Limiters are process-wide (keyed per socket id) and
// created once, shared across all connections.
export function registerSocketHandlers(io: Server, service: RoomService, logger: Logger): void {
  const limiters = {
    join: new RateLimiter(5, 0.5), // ~5 burst, refill 1 per 2s
    signal: new RateLimiter(60, 30), // SDP/ICE bursts on connect
    message: new RateLimiter(20, 5), // state + chat
  };

  io.on("connection", (socket) => {
    const ctx: SocketContext = { io, socket, service, limiters, logger };
    registerJoinHandler(ctx);
    registerSignalHandler(ctx);
    registerStateHandler(ctx);
    registerChatHandler(ctx);
    registerLeaveHandler(ctx);
  });
}
