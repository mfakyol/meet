import { stateSchema } from "../../schemas/signaling.schema.js";
import type { SocketContext } from "../context.js";

export function registerStateHandler(ctx: SocketContext): void {
  const { socket, service, limiters } = ctx;

  // Broadcast mic/camera on-off state to the sender's own room.
  socket.on("state", (payload: unknown) => {
    if (!limiters.message.allow(socket.id)) return;

    const roomId = socket.data.roomId;
    if (!roomId) return;

    const parsed = stateSchema.safeParse(payload);
    if (!parsed.success) return;

    const peer = service.applyState(roomId, socket.id, parsed.data);
    if (!peer) return;

    socket.to(roomId).emit("peer-state", { id: socket.id, audio: peer.audio, video: peer.video });
  });
}
