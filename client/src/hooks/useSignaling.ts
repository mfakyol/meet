import { useEffect, useRef } from "react";
import { createSocket, type AppSocket } from "@/lib/socket";
import type {
  ChatPayload,
  JoinAck,
  JoinPayload,
  Peer,
  PeerLeftPayload,
  PeerStatePayload,
  SignalData,
} from "@/types";

interface Handlers {
  onPeerJoined: (peer: Peer) => void;
  onSignal: (from: string, data: SignalData) => void;
  onPeerState: (payload: PeerStatePayload) => void;
  onPeerLeft: (payload: PeerLeftPayload) => void;
  onChat: (message: ChatPayload) => void;
}

export interface Signaling {
  join: (payload: JoinPayload, ack: (res: JoinAck) => void) => void;
  emitSignal: (to: string, data: SignalData) => void;
  emitState: (patch: { audio?: boolean; video?: boolean }) => void;
  emitChat: (text: string) => void;
  /** Notify peers and disconnect (on leave/unmount). */
  leave: () => void;
  /** Our own socket id (once connected). */
  getSelfId: () => string | undefined;
}

// Owns the socket connection and typed emit/on. Listeners are registered once
// and read the latest handlers via a ref, so handler identity can change freely.
export function useSignaling(handlers: Handlers): Signaling {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const socketRef = useRef<AppSocket | null>(null);
  const apiRef = useRef<Signaling | undefined>(undefined);

  if (!apiRef.current) {
    apiRef.current = {
      join: (payload, ack) => socketRef.current?.emit("join", payload, ack),
      emitSignal: (to, data) => socketRef.current?.emit("signal", { to, data }),
      emitState: (patch) => socketRef.current?.emit("state", patch),
      emitChat: (text) => socketRef.current?.emit("chat", { text }),
      leave: () => {
        socketRef.current?.emit("leave");
        socketRef.current?.disconnect();
      },
      getSelfId: () => socketRef.current?.id,
    };
  }

  useEffect(() => {
    const socket = createSocket();
    socketRef.current = socket;

    socket.on("peer-joined", (p) => handlersRef.current.onPeerJoined(p));
    socket.on("signal", ({ from, data }) => handlersRef.current.onSignal(from, data));
    socket.on("peer-state", (p) => handlersRef.current.onPeerState(p));
    socket.on("peer-left", (p) => handlersRef.current.onPeerLeft(p));
    socket.on("chat", (m) => handlersRef.current.onChat(m));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return apiRef.current;
}
