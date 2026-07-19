import type { Peer } from "./signaling";

// View models the UI renders (domain types live in `signaling.ts`).

// A remote participant. A peer may publish up to two video streams (camera and
// screen); we keep every received stream keyed by id and derive the two.
export interface RemotePeer extends Peer {
  /** Received MediaStreams keyed by stream id (camera and/or screen). */
  streams: Map<string, MediaStream>;
  /** The stream id the peer announced as their screen share (null = none). */
  screenId: string | null;
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

// A single rendered video cell (a camera or a screen, local or remote).
export interface Tile {
  key: string;
  name: string;
  stream: MediaStream | null;
  self?: boolean;
  muted?: boolean;
  audioOff?: boolean;
  videoOff?: boolean;
  screen?: boolean;
}
