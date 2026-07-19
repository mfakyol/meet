import { useCallback, useEffect, useRef, useState } from "react";
import { usePeerConnections } from "./usePeerConnections";
import { useSignaling, type Signaling } from "./useSignaling";
import { useLocalMedia, type LocalMedia } from "./useLocalMedia";
import type { ChatMessage, ChatPayload, RemotePeer, RoomStatus, Tile } from "@/types";

export interface UseRoom {
  selfId: string | null;
  status: RoomStatus;
  error: string | null;
  /** People in the room (for the participant count). */
  peers: RemotePeer[];
  /** Video cells to render, ordered: screens first, self camera last. */
  tiles: Tile[];
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  messages: ChatMessage[];
  toggleMic: () => void;
  toggleCam: () => void;
  toggleShare: () => Promise<void>;
  sendChat: (text: string) => void;
  /** Device selection. */
  cameraId: string | null;
  micId: string | null;
  speakerId: string | null;
  setCamera: (deviceId: string) => Promise<void>;
  setMic: (deviceId: string) => Promise<void>;
  setSpeaker: (deviceId: string) => void;
}

// Derive a peer's camera stream (the received stream that isn't the screen).
function cameraStreamOf(peer: RemotePeer): MediaStream | null {
  for (const [id, stream] of peer.streams) {
    if (id !== peer.screenId) return stream;
  }
  return null;
}

function screenStreamOf(peer: RemotePeer): MediaStream | null {
  return peer.screenId ? peer.streams.get(peer.screenId) ?? null : null;
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
  const [speakerId, setSpeakerId] = useState<string | null>(null);

  // Forward refs let the three hooks reference each other despite the cycle
  // (media ← signaling ← peers ← media). All are read at event time, not build time.
  const signalingRef = useRef<Signaling | undefined>(undefined);
  const mediaRef = useRef<LocalMedia | undefined>(undefined);

  const upsertPeer = useCallback((id: string, patch: Partial<RemotePeer>) => {
    setPeersMap((prev) => {
      const next = new Map(prev);
      const cur =
        next.get(id) ??
        ({ id, name: "Guest", audio: true, video: true, streams: new Map(), screenId: null } as RemotePeer);
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

  // A remote track arrived — record its stream (camera and screen have distinct ids).
  const addPeerStream = useCallback((id: string, stream: MediaStream | null) => {
    if (!stream) return;
    setPeersMap((prev) => {
      const cur = prev.get(id);
      if (!cur) return prev;
      if (cur.streams.has(stream.id)) return prev;
      const streams = new Map(cur.streams);
      streams.set(stream.id, stream);
      const next = new Map(prev);
      next.set(id, { ...cur, streams });
      return next;
    });
  }, []);

  // A peer started/stopped sharing — mark which stream is their screen, and drop
  // the previous screen stream when it changes (so it isn't shown as a camera).
  const setPeerScreen = useCallback((id: string, screenId: string | null) => {
    setPeersMap((prev) => {
      const cur = prev.get(id);
      if (!cur) return prev;
      const streams = new Map(cur.streams);
      if (cur.screenId && cur.screenId !== screenId) streams.delete(cur.screenId);
      const next = new Map(prev);
      next.set(id, { ...cur, screenId, streams });
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
    getSharedScreen: () => mediaRef.current?.getSharedScreen() ?? null,
    sendSignal: (to, data) => signalingRef.current?.emitSignal(to, data),
    onRemoteStream: (id, stream) => addPeerStream(id, stream),
  });

  const signaling = useSignaling({
    onPeerJoined: (p) => {
      upsertPeer(p.id, { name: p.name, audio: p.audio, video: p.video });
      // We are the existing peer → polite (we yield on glare).
      pcs.ensure(p.id, true);
      // If we're sharing, re-announce so the newcomer can label our screen.
      const shared = mediaRef.current?.getSharedScreen();
      if (shared) signalingRef.current?.emitScreen(shared.stream.id);
    },
    onSignal: (from, data) => void pcs.handleSignal(from, data),
    onPeerState: ({ id, audio, video }) => upsertPeer(id, { audio, video }),
    onPeerScreen: ({ id, screenId }) => setPeerScreen(id, screenId),
    onPeerLeft: ({ id }) => {
      pcs.remove(id);
      removePeer(id);
    },
    onChat: appendChat,
  });
  signalingRef.current = signaling;

  const media = useLocalMedia({
    onMediaState: (patch) => signaling.emitState(patch),
    onSetScreen: (screenTrack, screenStream) => {
      pcs.setSharedScreen(screenTrack, screenStream);
      signaling.emitScreen(screenStream?.id ?? null);
    },
    onReplaceTrack: (oldTrack, newTrack, stream) => pcs.replaceTrack(oldTrack, newTrack, stream),
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
            // We are the newcomer → impolite (we win glare and drive the offer).
            pcs.ensure(p.id, false);
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

  const peers = [...peersMap.values()];

  // Ordered tiles: all screens first (remote + own), then remote cameras, then
  // our own camera last.
  const tiles: Tile[] = [];
  for (const p of peers) {
    const screen = screenStreamOf(p);
    if (screen) tiles.push({ key: `${p.id}:screen`, name: `${p.name} — ekran`, stream: screen, screen: true });
  }
  if (media.localScreen) {
    tiles.push({ key: "self:screen", name: `${name} — ekran`, stream: media.localScreen, screen: true, self: true, muted: true });
  }
  for (const p of peers) {
    tiles.push({
      key: p.id,
      name: p.name,
      stream: cameraStreamOf(p),
      audioOff: !p.audio,
      videoOff: !p.video,
    });
  }
  tiles.push({
    key: "self",
    name,
    stream: media.localStream,
    self: true,
    muted: true,
    audioOff: !media.micOn,
    videoOff: !media.camOn,
  });

  return {
    selfId,
    status,
    error,
    peers,
    tiles,
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
    cameraId: media.cameraId,
    micId: media.micId,
    speakerId,
    setCamera: media.setCamera,
    setMic: media.setMic,
    setSpeaker: setSpeakerId,
  };
}
