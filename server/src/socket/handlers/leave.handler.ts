import type { SocketContext } from "../context.js";

export function registerLeaveHandler(ctx: SocketContext): void {
  const { socket, service, limiters, logger } = ctx;

  const leave = () => {
    const roomId = socket.data.roomId;
    if (roomId) {
      service.leave(roomId, socket.id);
      socket.to(roomId).emit("peer-left", { id: socket.id });
      socket.leave(roomId);
      socket.data.roomId = undefined;
      logger.debug({ roomId, socketId: socket.id }, "peer left");
    }
    // Free per-socket limiter state so it doesn't grow unbounded.
    limiters.join.forget(socket.id);
    limiters.signal.forget(socket.id);
    limiters.message.forget(socket.id);
  };

  socket.on("leave", leave);
  socket.on("disconnect", leave);
}
