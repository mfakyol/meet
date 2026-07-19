// Shared domain + signaling types. Payload types are derived from Zod schemas
// (see `schemas/`) so validation and types share one source of truth.

export interface Peer {
  id: string;
  name: string;
  audio: boolean;
  video: boolean;
}

// Ack returned to the newcomer on `join`.
export type JoinAck =
  | { ok: true; selfId: string; peers: Peer[] }
  | { ok: false; error: string };

export type Ack = (res: JoinAck) => void;

// Data we attach to each socket for the life of the connection.
declare module "socket.io" {
  interface SocketData {
    roomId?: string;
  }
}
