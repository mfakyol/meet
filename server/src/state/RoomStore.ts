import type { Peer } from "../types/index.js";

// The only place room/peer state lives. All mutation goes through this store —
// no handler touches the raw Map directly. In-memory and per-process (ephemeral):
// restarting the server drops all rooms. Swap for a shared adapter to scale out.
export class RoomStore {
  // roomId -> (socketId -> Peer)
  private readonly rooms = new Map<string, Map<string, Peer>>();

  /** Number of active rooms (for the health endpoint). */
  get roomCount(): number {
    return this.rooms.size;
  }

  /** Current occupancy of a room. */
  size(roomId: string): number {
    return this.rooms.get(roomId)?.size ?? 0;
  }

  has(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  /** Snapshot of the peers currently in a room. */
  peers(roomId: string): Peer[] {
    return [...(this.rooms.get(roomId)?.values() ?? [])];
  }

  getPeer(roomId: string, socketId: string): Peer | undefined {
    return this.rooms.get(roomId)?.get(socketId);
  }

  /** True if both sockets are members of the same room. */
  sharesRoom(roomId: string, socketId: string): boolean {
    return this.rooms.get(roomId)?.has(socketId) ?? false;
  }

  add(roomId: string, peer: Peer): void {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Map();
      this.rooms.set(roomId, room);
    }
    room.set(peer.id, peer);
  }

  /** Remove a peer; deletes the room when it empties. */
  remove(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.delete(socketId);
    if (room.size === 0) this.rooms.delete(roomId);
  }

  /** Update mic/cam flags on an existing peer; returns the updated peer. */
  setMediaState(
    roomId: string,
    socketId: string,
    patch: { audio?: boolean; video?: boolean }
  ): Peer | undefined {
    const peer = this.getPeer(roomId, socketId);
    if (!peer) return undefined;
    if (typeof patch.audio === "boolean") peer.audio = patch.audio;
    if (typeof patch.video === "boolean") peer.video = patch.video;
    return peer;
  }
}
