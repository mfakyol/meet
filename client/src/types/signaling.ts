// Signaling protocol — mirrors the server's socket events (see server
// `schemas/signaling.schema.ts` and `types/`). Keep in sync with the server.

export interface Peer {
  id: string;
  name: string;
  audio: boolean;
  video: boolean;
}

// SDP offer/answer or a single ICE candidate, relayed peer-to-peer.
export interface SignalData {
  type?: "offer" | "answer";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

export interface JoinPayload {
  roomId: string;
  name: string;
  audio: boolean;
  video: boolean;
}

export type JoinAck =
  | { ok: true; selfId: string; peers: Peer[] }
  | { ok: false; error: string };

export interface SignalMessage {
  from: string;
  data: SignalData;
}

export interface PeerStatePayload {
  id: string;
  audio: boolean;
  video: boolean;
}

export interface PeerLeftPayload {
  id: string;
}

export interface ChatPayload {
  from: string;
  name: string;
  text: string;
  ts: number;
}

// Typed event maps for the socket.io client (one source of truth for emits/on).
export interface ServerToClientEvents {
  "peer-joined": (peer: Peer) => void;
  signal: (message: SignalMessage) => void;
  "peer-state": (payload: PeerStatePayload) => void;
  "peer-left": (payload: PeerLeftPayload) => void;
  chat: (message: ChatPayload) => void;
}

export interface ClientToServerEvents {
  join: (payload: JoinPayload, ack: (res: JoinAck) => void) => void;
  signal: (payload: { to: string; data: SignalData }) => void;
  state: (payload: { audio?: boolean; video?: boolean }) => void;
  chat: (payload: { text: string }) => void;
  leave: () => void;
}
