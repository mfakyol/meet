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
  /**
   * Create (or reuse) the connection to a peer. `polite` decides who yields on
   * glare (the existing peer is polite, the newcomer impolite).
   */
  ensure: (peerId: string, polite: boolean) => RTCPeerConnection;
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
  /**
   * Publish local media to every connection once it's acquired (we join the
   * room before the permission prompt resolves). Skips tracks already added.
   */
  addLocalTracks: (stream: MediaStream) => void;
  /**
   * Swap a local track (camera/mic device switch) on every connection. Replaces
   * the sender carrying `oldTrack`; if there's none (was watch-only), adds the
   * new track and renegotiates.
   */
  replaceTrack: (
    oldTrack: MediaStreamTrack | null,
    newTrack: MediaStreamTrack,
    stream: MediaStream
  ) => void;
  /** Tear down and forget one peer. */
  remove: (peerId: string) => void;
  /** Close every connection (on leave/unmount). */
  closeAll: () => void;
}

// Per-connection perfect-negotiation state.
interface PcState {
  polite: boolean;
  makingOffer: boolean;
  ignoreOffer: boolean;
}

// Owns the mesh of RTCPeerConnections using the "perfect negotiation" pattern,
// so either side can (re)negotiate at any time — e.g. adding/removing a screen
// track — with glare resolved by the polite/impolite roles. The hook exposes a
// stable imperative handle so it never triggers re-subscription.
export function usePeerConnections(options: Options): PeerConnections {
  const optRef = useRef(options);
  optRef.current = options;

  const pcs = useRef(new Map<string, RTCPeerConnection>());
  const state = useRef(new Map<string, PcState>());
  // ICE candidates that arrive before the remote description is set.
  const pendingIce = useRef(new Map<string, RTCIceCandidateInit[]>());
  // The screen-share sender per connection (so we can remove it on stop).
  const screenSenders = useRef(new Map<RTCPeerConnection, RTCRtpSender>());
  const apiRef = useRef<PeerConnections | undefined>(undefined);

  if (!apiRef.current) {
    function ensure(peerId: string, polite: boolean): RTCPeerConnection {
      const existing = pcs.current.get(peerId);
      if (existing) return existing;

      const pc = new RTCPeerConnection({ iceServers: getIceServers() });
      const st: PcState = { polite, makingOffer: false, ignoreOffer: false };
      pcs.current.set(peerId, pc);
      state.current.set(peerId, st);

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

      // Any (re)negotiation — initial tracks, screen add/remove — offers here;
      // glare is resolved in handleSignal via the polite/impolite roles.
      pc.onnegotiationneeded = async () => {
        try {
          st.makingOffer = true;
          await pc.setLocalDescription();
          optRef.current.sendSignal(peerId, { type: "offer", sdp: pc.localDescription?.sdp });
        } catch (err) {
          console.error("negotiation error", err);
        } finally {
          st.makingOffer = false;
        }
      };
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
      let st = state.current.get(from);
      if (!pc || !st) {
        // Signal arrived before we set up the peer — treat ourselves as polite.
        pc = ensure(from, true);
        st = state.current.get(from)!;
      }

      try {
        if (data.type === "offer" || data.type === "answer") {
          const description = { type: data.type, sdp: data.sdp } as RTCSessionDescriptionInit;
          const offerCollision =
            data.type === "offer" && (st.makingOffer || pc.signalingState !== "stable");

          st.ignoreOffer = !st.polite && offerCollision;
          if (st.ignoreOffer) return;

          // A polite peer with a colliding offer rolls back implicitly here.
          await pc.setRemoteDescription(description);
          await flushIce(from, pc);

          if (data.type === "offer") {
            await pc.setLocalDescription();
            optRef.current.sendSignal(from, { type: "answer", sdp: pc.localDescription?.sdp });
          }
        } else if (data.candidate) {
          if (pc.remoteDescription) {
            try {
              await pc.addIceCandidate(data.candidate);
            } catch (err) {
              if (!st.ignoreOffer) console.error("addIceCandidate", err);
            }
          } else {
            const l = pendingIce.current.get(from) ?? [];
            l.push(data.candidate);
            pendingIce.current.set(from, l);
          }
        }
      } catch (err) {
        console.error("handleSignal error", err);
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

    function addLocalTracks(stream: MediaStream): void {
      pcs.current.forEach((pc) => {
        stream.getTracks().forEach((track) => {
          const already = pc.getSenders().some((s) => s.track === track);
          if (!already) pc.addTrack(track, stream); // → renegotiation
        });
      });
    }

    function replaceTrack(
      oldTrack: MediaStreamTrack | null,
      newTrack: MediaStreamTrack,
      stream: MediaStream
    ): void {
      pcs.current.forEach((pc) => {
        const sender = oldTrack ? pc.getSenders().find((s) => s.track === oldTrack) : undefined;
        if (sender) void sender.replaceTrack(newTrack);
        else pc.addTrack(newTrack, stream); // no prior track → renegotiate
      });
    }

    function remove(peerId: string): void {
      const pc = pcs.current.get(peerId);
      pc?.close();
      if (pc) screenSenders.current.delete(pc);
      pcs.current.delete(peerId);
      state.current.delete(peerId);
      pendingIce.current.delete(peerId);
    }

    function closeAll(): void {
      pcs.current.forEach((pc) => pc.close());
      pcs.current.clear();
      state.current.clear();
      pendingIce.current.clear();
      screenSenders.current.clear();
    }

    apiRef.current = {
      ensure,
      handleSignal,
      setSharedScreen,
      addLocalTracks,
      replaceTrack,
      remove,
      closeAll,
    };
  }

  return apiRef.current;
}
