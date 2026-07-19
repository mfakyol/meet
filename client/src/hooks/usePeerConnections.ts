import { useRef } from "react";
import { getIceServers } from "@/lib/ice";
import type { SignalData } from "@/types";

interface Options {
  /** Local media whose tracks are attached to each new connection. */
  getLocalStream: () => MediaStream | null;
  /** The screen currently being shared (so peers that join mid-share get it). */
  getSharedScreen: () => { track: MediaStreamTrack; stream: MediaStream } | null;
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
  /**
   * Start/stop screen sharing on every connection. The screen is sent as a
   * SEPARATE track/stream (never replacing the camera), so it shows as its own
   * tile. Adding/removing a track renegotiates — works with or without a camera.
   */
  setSharedScreen: (
    screenTrack: MediaStreamTrack | null,
    screenStream: MediaStream | null
  ) => void;
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
  // The screen-share sender per connection (so we can remove it on stop).
  const screenSenders = useRef(new Map<RTCPeerConnection, RTCRtpSender>());
  const apiRef = useRef<PeerConnections | undefined>(undefined);

  if (!apiRef.current) {
    async function makeOffer(pc: RTCPeerConnection, peerId: string): Promise<void> {
      try {
        // Avoid glare: only offer from a stable state.
        if (pc.signalingState !== "stable") return;
        await pc.setLocalDescription(await pc.createOffer());
        optRef.current.sendSignal(peerId, { type: "offer", sdp: pc.localDescription?.sdp });
      } catch (err) {
        console.error("negotiation error", err);
      }
    }

    function ensure(peerId: string, initiator: boolean): RTCPeerConnection {
      const existing = pcs.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      pcs.current.set(peerId, pc);

      // Attach camera + mic. If we're mid-share, also send the screen as a
      // separate track so a peer joining during a share gets its own screen tile.
      const local = optRef.current.getLocalStream();
      local?.getTracks().forEach((t) => pc.addTrack(t, local));
      const shared = optRef.current.getSharedScreen();
      if (shared) {
        screenSenders.current.set(pc, pc.addTrack(shared.track, shared.stream));
      }

      pc.onicecandidate = (e) => {
        if (e.candidate) optRef.current.sendSignal(peerId, { candidate: e.candidate.toJSON() });
      };
      pc.ontrack = (e) => optRef.current.onRemoteStream(peerId, e.streams[0] ?? null);

      if (initiator) {
        // Newcomers initiate the first offer to existing peers (avoids glare),
        // and re-offer on later renegotiation (e.g. screen share add/remove).
        pc.onnegotiationneeded = () => void makeOffer(pc, peerId);
      } else {
        // Existing peers answer the newcomer's first offer rather than offering,
        // so skip the negotiation triggered by adding the initial tracks — but
        // still offer on later renegotiation (screen share).
        let skippedInitial = false;
        pc.onnegotiationneeded = () => {
          if (!skippedInitial) {
            skippedInitial = true;
            return;
          }
          void makeOffer(pc, peerId);
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

    function setSharedScreen(
      screenTrack: MediaStreamTrack | null,
      screenStream: MediaStream | null
    ): void {
      pcs.current.forEach((pc) => {
        const sender = screenSenders.current.get(pc);
        if (screenTrack && screenStream) {
          // Start (or replace) the screen track on its own sender.
          if (sender) void sender.replaceTrack(screenTrack);
          else screenSenders.current.set(pc, pc.addTrack(screenTrack, screenStream)); // → renegotiation
        } else if (sender) {
          // Stop: remove the screen sender and renegotiate.
          pc.removeTrack(sender);
          screenSenders.current.delete(pc);
        }
      });
    }

    function remove(peerId: string): void {
      const pc = pcs.current.get(peerId);
      pc?.close();
      if (pc) screenSenders.current.delete(pc);
      pcs.current.delete(peerId);
      pendingIce.current.delete(peerId);
    }

    function closeAll(): void {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      pendingIce.current.clear();
      screenSenders.current.clear();
    }

    apiRef.current = { ensure, handleSignal, setSharedScreen, remove, closeAll };
  }

  return apiRef.current;
}
