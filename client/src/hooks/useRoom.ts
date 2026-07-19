import { useCallback, useEffect, useRef, useState } from "react";
import { usePeerConnections } from "./usePeerConnections";
import { useSignaling, type Signaling } from "./useSignaling";
import { useLocalMedia, type LocalMedia } from "./useLocalMedia";
import type { ChatMessage, ChatPayload, RemotePeer, RoomStatus } from "@/types";

export interface UseRoom {
  selfId: string | null;
  status: RoomStatus;
  error: string | null;
  localStream: MediaStream | null;
  peers: RemotePeer[];
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  messages: ChatMessage[];
  toggleMic: () => void;
  toggleCam: () => void;
  toggleShare: () => Promise<void>;
  sendChat: (text: string) => void;
}

// The heart of the app: wires local media ⇄ the peer-connection mesh ⇄
// signaling into one participant/chat view. Each concern lives in its own hook;
// this orchestrator only connects them and owns the derived UI state.
export function useRoom(roomId: string, name: string): UseRoom {
  const [selfId, setSelfId] = useState<string | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [peersMap, setPeersMap] = useState<Map<string, RemotePeer>>(new Map());
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Forward refs let the three hooks reference each other despite the cycle
  // (media ← signaling ← peers ← media). All are read at event time, not build time.
  const signalingRef = useRef<Signaling | undefined>(undefined);
  const mediaRef = useRef<LocalMedia | undefined>(undefined);

  const upsertPeer = useCallback((id: string, patch: Partial<RemotePeer>) => {
    setPeersMap((prev) => {
      const next = new Map(prev);
      const cur = next.get(id) ?? { id, name: "Guest", audio: true, video: true, stream: null };
      next.set(id, { ...cur, ...patch });
      return next;
    });
  }, []);

  const removePeer = useCallback((id: string) => {
    setPeersMap((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const appendChat = useCallback((m: ChatPayload) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `${m.ts}-${m.from}-${prev.length}`,
        from: m.from,
        name: m.name,
        text: m.text,
        ts: m.ts,
        mine: m.from === signalingRef.current?.getSelfId(),
      },
    ]);
  }, []);

  const pcs = usePeerConnections({
    getLocalStream: () => mediaRef.current?.streamRef.current ?? null,
    sendSignal: (to, data) => signalingRef.current?.emitSignal(to, data),
    onRemoteStream: (id, stream) => upsertPeer(id, { stream }),
  });

  const signaling = useSignaling({
    onPeerJoined: (p) => {
      upsertPeer(p.id, { name: p.name, audio: p.audio, video: p.video });
      // We are the existing peer → pre-create (with our tracks) and answer.
      pcs.ensure(p.id, false);
    },
    onSignal: (from, data) => void pcs.handleSignal(from, data),
    onPeerState: ({ id, audio, video }) => upsertPeer(id, { audio, video }),
    onPeerLeft: ({ id }) => {
      pcs.remove(id);
      removePeer(id);
    },
    onChat: appendChat,
  });
  signalingRef.current = signaling;

  const media = useLocalMedia({
    onMediaState: (patch) => signaling.emitState(patch),
    onReplaceVideoTrack: (track) => pcs.replaceVideoTrack(track),
    onError: setError,
  });
  mediaRef.current = media;

  // Lifecycle: acquire media, then join and offer to existing peers.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stream = await media.acquire();
      if (cancelled) return;
      signaling.join(
        {
          roomId,
          name,
          audio: !!stream?.getAudioTracks().length,
          video: !!stream?.getVideoTracks().length,
        },
        (res) => {
          if (cancelled) return;
          if (!res.ok) {
            setError(res.error);
            setStatus("error");
            return;
          }
          setSelfId(res.selfId);
          setStatus("joined");
          for (const p of res.peers) {
            upsertPeer(p.id, { name: p.name, audio: p.audio, video: p.video });
            pcs.ensure(p.id, true); // onnegotiationneeded fires → sends offer
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      signaling.leave();
      pcs.closeAll();
      media.cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name]);

  return {
    selfId,
    status,
    error,
    localStream: media.localStream,
    peers: [...peersMap.values()],
    micOn: media.micOn,
    camOn: media.camOn,
    sharing: media.sharing,
    messages,
    toggleMic: media.toggleMic,
    toggleCam: media.toggleCam,
    toggleShare: media.toggleShare,
    sendChat: (text) => {
      const t = text.trim();
      if (t) signaling.emitChat(t);
    },
  };
}
