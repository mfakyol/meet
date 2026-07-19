import { AppError, clientMessage } from "../../errors/AppError.js";
import { env } from "../../config/env.js";
import { joinSchema } from "../../schemas/signaling.schema.js";
import type { Ack } from "../../types/index.js";
import type { SocketContext } from "../context.js";

export function registerJoinHandler(ctx: SocketContext): void {
  const { socket, service, limiters, logger } = ctx;

  socket.on("join", (payload: unknown, ack?: Ack) => {
    if (!limiters.join.allow(socket.id)) {
      ack?.({ ok: false, error: "Too many attempts. Slow down." });
      return;
    }

    const parsed = joinSchema.safeParse(payload);
    if (!parsed.success) {
      ack?.({ ok: false, error: parsed.error.issues[0]?.message ?? "Invalid join payload." });
      return;
    }
    const input = parsed.data;

    // A socket may only be in one room at a time.
    if (socket.data.roomId) {
      ack?.({ ok: false, error: "Already in a room." });
      return;
    }

    try {
      const { self, existing } = service.join(socket.id, input);
      socket.data.roomId = input.roomId;
      socket.join(input.roomId);
      socket.to(input.roomId).emit("peer-joined", self);
      ack?.({ ok: true, selfId: socket.id, peers: existing });
      logger.debug({ roomId: input.roomId, socketId: socket.id }, "peer joined");
    } catch (err) {
      if (!(err instanceof AppError)) logger.error({ err }, "join failed");
      ack?.({ ok: false, error: clientMessage(err, env.isProd) });
    }
  });
}
