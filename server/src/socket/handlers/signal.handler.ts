import { signalSchema } from "../../schemas/signaling.schema.js";
import type { SocketContext } from "../context.js";

export function registerSignalHandler(ctx: SocketContext): void {
  const { socket, io, service, limiters } = ctx;

  // Relay an SDP offer/answer or ICE candidate to a specific peer.
  socket.on("signal", (payload: unknown) => {
    if (!limiters.signal.allow(socket.id)) return;

    const parsed = signalSchema.safeParse(payload);
    if (!parsed.success) return;
    const { to, data } = parsed.data;

    // Relay integrity: default deny unless the target shares the sender's room.
    if (!service.canSignal(socket.data.roomId, to)) return;

    io.to(to).emit("signal", { from: socket.id, data });
  });
}
