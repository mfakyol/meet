import type { Peer } from "./signaling";

// View models the UI renders (domain types live in `signaling.ts`).

// A remote participant plus their live media stream.
export interface RemotePeer extends Peer {
  stream: MediaStream | null;
}

export interface ChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
  /** True when this client sent the message (own bubble). */
  mine: boolean;
}

export type RoomStatus = "connecting" | "joined" | "error";
