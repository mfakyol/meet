import { AppError } from "../errors/AppError.js";
import type { RoomStore } from "../state/RoomStore.js";
import type { Peer } from "../types/index.js";
import type { ChatInput, JoinInput, StateInput } from "../schemas/signaling.schema.js";

// Business logic, transport-agnostic: no `socket`, no `req`/`res`. Operates on
// the RoomStore and plain values so it's unit-testable and reusable.
export class RoomService {
  constructor(
    private readonly store: RoomStore,
    private readonly maxPerRoom: number
  ) {}

  /**
   * Admit a socket to a room. Returns the new peer plus the snapshot of peers
   * already present (taken before adding self — the newcomer initiates offers,
   * so only newcomers create offers; no glare). Throws when the room is full.
   */
  join(socketId: string, input: JoinInput): { self: Peer; existing: Peer[] } {
    if (this.store.size(input.roomId) >= this.maxPerRoom) {
      throw new AppError("ROOM_FULL", `Room is full (max ${this.maxPerRoom}).`);
    }
    const self: Peer = { id: socketId, name: input.name, audio: input.audio, video: input.video };
    const existing = this.store.peers(input.roomId);
    this.store.add(input.roomId, self);
    return { self, existing };
  }

  /**
   * Relay integrity: a socket may only signal a target that shares its room.
   * Without this any client could relay SDP/ICE to arbitrary socket ids.
   */
  canSignal(roomId: string | undefined, to: string): boolean {
    if (!roomId) return false;
    return this.store.sharesRoom(roomId, to);
  }

  /** Apply mic/cam state to the sender's own peer; returns the updated peer. */
  applyState(roomId: string, socketId: string, input: StateInput): Peer | undefined {
    return this.store.setMediaState(roomId, socketId, input);
  }

  /** Build a chat message from the sender's own room membership. */
  buildChat(
    roomId: string,
    socketId: string,
    input: ChatInput
  ): { from: string; name: string; text: string; ts: number } {
    const name = this.store.getPeer(roomId, socketId)?.name ?? "Guest";
    return { from: socketId, name, text: input.text, ts: Date.now() };
  }

  /** Remove a peer from its room. */
  leave(roomId: string, socketId: string): void {
    this.store.remove(roomId, socketId);
  }
}
