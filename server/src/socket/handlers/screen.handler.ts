import { screenSchema } from "../../schemas/signaling.schema.js";
import type { SocketContext } from "../context.js";

export function registerScreenHandler(ctx: SocketContext): void {
  const { socket, limiters } = ctx;

  // Announce (or stop) a screen share to the sender's own room. Carries the
  // MediaStream id so peers can tell the screen track apart from the camera.
  socket.on("screen", (payload: unknown) => {
    if (!limiters.message.allow(socket.id)) return;

    const roomId = socket.data.roomId;
    if (!roomId) return;

    const parsed = screenSchema.safeParse(payload);
    if (!parsed.success) return;

    socket.to(roomId).emit("peer-screen", { id: socket.id, screenId: parsed.data.streamId });
  });
}
