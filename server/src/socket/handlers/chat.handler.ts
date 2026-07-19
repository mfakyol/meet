import { chatSchema } from "../../schemas/signaling.schema.js";
import type { SocketContext } from "../context.js";

export function registerChatHandler(ctx: SocketContext): void {
  const { socket, io, service, limiters } = ctx;

  // Ephemeral chat, never persisted. Room is derived from the sender's own
  // membership — never from a client-supplied room id.
  socket.on("chat", (payload: unknown) => {
    if (!limiters.message.allow(socket.id)) return;

    const roomId = socket.data.roomId;
    if (!roomId) return;

    const parsed = chatSchema.safeParse(payload);
    if (!parsed.success) return;

    const message = service.buildChat(roomId, socket.id, parsed.data);
    io.to(roomId).emit("chat", message);
  });
}
