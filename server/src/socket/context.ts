import type { Server, Socket } from "socket.io";
import type { Logger } from "pino";
import type { RoomService } from "../services/roomService.js";
import type { RateLimiter } from "../services/rateLimiter.js";

// Dependencies handed to every socket handler. Handlers stay thin: validate,
// rate-limit, delegate to the service, emit.
export interface SocketContext {
  io: Server;
  socket: Socket;
  service: RoomService;
  limiters: {
    join: RateLimiter;
    signal: RateLimiter;
    message: RateLimiter; // shared budget for state + chat
  };
  logger: Logger;
}
