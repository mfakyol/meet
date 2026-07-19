import { useRef } from "react";
import { getIceServers } from "@/lib/ice";
import type { SignalData } from "@/types";

interface Options {
  /** Local media whose tracks are attached to each new connection. */
  getLocalStream: () => MediaStream | null;
  /** Send an SDP/ICE payload to a specific peer via signaling. */
  sendSignal: (to: string, data: SignalData) => void;
  /** A remote track arrived for a peer. */
  onRemoteStream: (peerId: string, stream: MediaStream | null) => void;
}

export interface PeerConnections {
  /** Create (or reuse) the connection to a peer. Only the initiator offers. */
  ensure: (peerId: string, initiator: boolean) => RTCPeerConnection;
  /** Apply an inbound SDP offer/answer or ICE candidate from a peer. */
  handleSignal: (from: string, data: SignalData) => Promise<void>;
  /** Swap the outgoing video track on every connection (camera ⇄ screen). */
  replaceVideoTrack: (track: MediaStreamTrack | null) => void;
  /** Tear down and forget one peer. */
  remove: (peerId: string) => void;
  /** Close every connection (on leave/unmount). */
  closeAll: () => void;
}

// Owns the mesh of RTCPeerConnections. All WebRTC lifecycle lives here; the hook
// exposes a stable imperative handle so it never triggers re-subscription.
export function usePeerConnections(options: Options): PeerConnections {
  const optRef = useRef(options);
  optRef.current = options;

  const pcs = useRef(new Map<string, RTCPeerConnection>());
  // ICE candidates that arrive before the remote description is set.
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  const apiRef = useRef<PeerConnections | undefined>(undefined);

  if (!apiRef.current) {
    function ensure(peerId: string, initiator: boolean): RTCPeerConnection {
      const existing = pcs.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcs.current.set(peerId, pc);

      const local = optRef.current.getLocalStream();
      local?.getTracks().forEach((t) => pc.addTrack(t, local));

      pc.onicecandidate = (e) => {
        if (e.candidate) optRef.current.sendSignal(peerId, { candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => optRef.current.onRemoteStream(peerId, e.streams[0] ?? null);

      // Only the initiator makes offers (newcomers initiate to existing peers),
      // which avoids offer/answer glare.
      if (initiator) {
        pc.onnegotiationneeded = async () => {
          try {
            await pc.setLocalDescription(await pc.createOffer());
            optRef.current.sendSignal(peerId, { type: "offer", sdp: pc.localDescription?.sdp });
          } catch (err) {
            console.error("negotiation error", err);
          }
        };
      }
      return pc;
    }

    async function flushIce(peerId: string, pc: RTCPeerConnection): Promise<void> {
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

    async function handleSignal(from: string, data: SignalData): Promise<void> {
      let pc = pcs.current.get(from);
      if (data.type === "offer") {
        if (!pc) pc = ensure(from, false);
        await pc.setRemoteDescription({ type: "offer", sdp: data.sdp });
        await flushIce(from, pc);
        await pc.setLocalDescription(await pc.createAnswer());
        optRef.current.sendSignal(from, { type: "answer", sdp: pc.localDescription?.sdp });
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
    }

    function replaceVideoTrack(track: MediaStreamTrack | null): void {
      pcs.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === "video");
        if (sender) void sender.replaceTrack(track);
      });
    }

    function remove(peerId: string): void {
      pcs.current.get(peerId)?.close();
      pcs.current.delete(peerId);
      pendingIce.current.delete(peerId);
    }

    function closeAll(): void {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      pendingIce.current.clear();
    }

    apiRef.current = { ensure, handleSignal, replaceVideoTrack, remove, closeAll };
  }

  return apiRef.current;
}
