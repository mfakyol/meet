import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { getIceServers } from "./ice";

export interface PeerMeta {
  id: string;
  name: string;
  audio: boolean;
  video: boolean;
}

export interface RemotePeer extends PeerMeta {
  stream: MediaStream | null;
}

export interface ChatMessage {
  id: string;
  from: string;
  name: string;
  text: string;
  ts: number;
  mine: boolean;
}

type RoomStatus = "connecting" | "joined" | "error";

interface SignalData {
  type?: "offer" | "answer";
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}

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

// Replace the outgoing video track on every peer connection (used for camera
// on/off swaps and screen-share) without renegotiating.
function replaceVideoTrackEverywhere(
  pcs: Map<string, RTCPeerConnection>,
  track: MediaStreamTrack | null
) {
  pcs.forEach((pc) => {
    const sender = pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) void sender.replaceTrack(track);
  });
}

export function useRoom(roomId: string, name: string): UseRoom {
  const socketRef = useRef<Socket | null>(null);
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  // ICE candidates that arrive before the remote description is set.
  const pendingIce = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const [selfId, setSelfId] = useState<string | null>(null);
  const [status, setStatus] = useState<RoomStatus>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peersMap, setPeersMap] = useState<Map<string, RemotePeer>>(new Map());
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const upsertPeer = useCallback((id: string, patch: Partial<RemotePeer>) => {
    setPeersMap((prev) => {
      const next = new Map(prev);
      const cur =
        next.get(id) ?? { id, name: "Guest", audio: true, video: true, stream: null };
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

  useEffect(() => {
    let cancelled = false;
    const socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });
    socketRef.current = socket;

    function createPeer(peerId: string, initiator: boolean): RTCPeerConnection {
      const existing = pcsRef.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcsRef.current.set(peerId, pc);

      localStreamRef.current
        ?.getTracks()
        .forEach((t) => pc.addTrack(t, localStreamRef.current!));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("signal", {
            to: peerId,
            data: { candidate: e.candidate.toJSON() },
          });
        }
      };
      pc.ontrack = (e) => {
        upsertPeer(peerId, { stream: e.streams[0] ?? null });
      };

      // Only the initiator makes offers (newcomers initiate to existing peers),
      // which avoids offer/answer glare.
      if (initiator) {
        pc.onnegotiationneeded = async () => {
          try {
            await pc.setLocalDescription(await pc.createOffer());
            socket.emit("signal", {
              to: peerId,
              data: { type: "offer", sdp: pc.localDescription?.sdp },
            });
          } catch (err) {
            console.error("negotiation error", err);
          }
        };
      }
      return pc;
    }

    async function flushIce(peerId: string, pc: RTCPeerConnection) {
      const list = pendingIce.current.get(peerId);
      if (!list) return;
      for (const c of list) {
        try {
          await pc.addIceCandidate(c);
        } catch (err) {
          console.error("addIceCandidate", err);
        }
      }
      pendingIce.current.delete(peerId);
    }

    async function start() {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
      } catch {
        setError("Kamera/mikrofon açılamadı — sadece izleme modunda katıldın.");
      }
      if (cancelled) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      cameraTrackRef.current = stream?.getVideoTracks()[0] ?? null;
      setLocalStream(stream);
      setMicOn(!!stream?.getAudioTracks().length);
      setCamOn(!!stream?.getVideoTracks().length);

      socket.emit(
        "join",
        {
          roomId,
          name,
          audio: !!stream?.getAudioTracks().length,
          video: !!stream?.getVideoTracks().length,
        },
        (res: { ok: true; selfId: string; peers: PeerMeta[] } | { ok: false; error: string }) => {
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
            createPeer(p.id, true); // onnegotiationneeded fires → sends offer
          }
        }
      );
    }

    socket.on("peer-joined", (p: PeerMeta) => {
      upsertPeer(p.id, { name: p.name, audio: p.audio, video: p.video });
      // We are the existing peer → wait for their offer, but pre-create the
      // connection (with our local tracks) so we can answer.
      createPeer(p.id, false);
    });

    socket.on("signal", async ({ from, data }: { from: string; data: SignalData }) => {
      let pc = pcsRef.current.get(from);
      if (data.type === "offer") {
        if (!pc) pc = createPeer(from, false);
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await flushIce(from, pc);
        await pc.setLocalDescription(await pc.createAnswer());
        socket.emit("signal", {
          to: from,
          data: { type: "answer", sdp: pc.localDescription?.sdp },
        });
      } else if (data.type === "answer") {
        if (pc) {
          await pc.setRemoteDescription({ type: "answer", sdp: data.sdp });
          await flushIce(from, pc);
        }
      } else if (data.candidate) {
        if (pc?.remoteDescription) {
          try {
            await pc.addIceCandidate(data.candidate);
          } catch (err) {
            console.error("addIceCandidate", err);
          }
        } else {
          const l = pendingIce.current.get(from) ?? [];
          l.push(data.candidate);
          pendingIce.current.set(from, l);
        }
      }
    });

    socket.on("peer-state", ({ id, audio, video }: PeerMeta) => {
      upsertPeer(id, { audio, video });
    });

    socket.on("peer-left", ({ id }: { id: string }) => {
      pcsRef.current.get(id)?.close();
      pcsRef.current.delete(id);
      removePeer(id);
    });

    socket.on("chat", (m: { from: string; name: string; text: string; ts: number }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${m.ts}-${m.from}-${prev.length}`,
          from: m.from,
          name: m.name,
          text: m.text,
          ts: m.ts,
          mine: m.from === socket.id,
        },
      ]);
    });

    void start();

    return () => {
      cancelled = true;
      socket.emit("leave");
      socket.disconnect();
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name]);

  const toggleMic = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setMicOn(track.enabled);
    socketRef.current?.emit("state", { audio: track.enabled });
  }, []);

  const toggleCam = useCallback(() => {
    const track = localStreamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    setCamOn(track.enabled);
    socketRef.current?.emit("state", { video: track.enabled });
  }, []);

  const stopShare = useCallback(() => {
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    replaceVideoTrackEverywhere(pcsRef.current, cameraTrackRef.current);
    setLocalStream(localStreamRef.current);
    setSharing(false);
  }, []);

  const toggleShare = useCallback(async () => {
    if (sharing) {
      stopShare();
      return;
    }
    if (!cameraTrackRef.current) {
      setError("Ekran paylaşımı için kamera gerekiyor.");
      return;
    }
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screen.getVideoTracks()[0];
      screenStreamRef.current = screen;
      replaceVideoTrackEverywhere(pcsRef.current, screenTrack);
      // Local preview shows the shared screen.
      setLocalStream(screen);
      setSharing(true);
      // Browser "stop sharing" button.
      screenTrack.onended = () => stopShare();
    } catch {
      // user cancelled the picker
    }
  }, [sharing, stopShare]);

  const sendChat = useCallback((text: string) => {
    const t = text.trim();
    if (t) socketRef.current?.emit("chat", { text: t });
  }, []);

  return {
    selfId,
    status,
    error,
    localStream,
    peers: [...peersMap.values()],
    micOn,
    camOn,
    sharing,
    messages,
    toggleMic,
    toggleCam,
    toggleShare,
    sendChat,
  };
}
