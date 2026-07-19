import { useRef, useState, type RefObject } from "react";

interface Options {
  /** Mic/cam toggled — broadcast the new state to the room. */
  onMediaState: (patch: { audio?: boolean; video?: boolean }) => void;
  /**
   * Screen-share started (screenTrack set) or stopped (null). The peer layer
   * swaps/adds the outgoing video track; `cameraTrack` is what to restore on stop.
   */
  onSetScreen: (
    screenTrack: MediaStreamTrack | null,
    screenStream: MediaStream | null,
    cameraTrack: MediaStreamTrack | null
  ) => void;
  /** Surface a user-facing error (media denied, …). */
  onError: (message: string) => void;
}

export interface LocalMedia {
  localStream: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  /** The live camera/mic stream, readable synchronously by the peer layer. */
  streamRef: RefObject<MediaStream | null>;
  /** The screen currently being shared, if any (for peers joining mid-share). */
  getSharedScreen: () => { track: MediaStreamTrack; stream: MediaStream } | null;
  /** Acquire camera+mic once. Resolves to the stream (or null if denied). */
  acquire: () => Promise<MediaStream | null>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleShare: () => Promise<void>;
  /** Stop all local + screen tracks (on leave/unmount). */
  cleanup: () => void;
}

// Owns local camera/microphone + screen-share. Cross-cutting effects (emitting
// state, swapping tracks on peer connections) are delegated via callbacks.
// Screen sharing does NOT require a camera.
export function useLocalMedia(options: Options): LocalMedia {
  const optRef = useRef(options);
  optRef.current = options;

  const streamRef = useRef<MediaStream | null>(null);
  const cameraTrackRef = useRef<MediaStreamTrack | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const sharingRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const apiRef =
    useRef<Omit<LocalMedia, "localStream" | "micOn" | "camOn" | "sharing"> | undefined>(undefined);

  if (!apiRef.current) {
    async function acquire(): Promise<MediaStream | null> {
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch {
        optRef.current.onError("Kamera/mikrofon açılamadı — sadece izleme modunda katıldın.");
      }
      streamRef.current = stream;
      cameraTrackRef.current = stream?.getVideoTracks()[0] ?? null;
      setLocalStream(stream);
      setMicOn(!!stream?.getAudioTracks().length);
      setCamOn(!!stream?.getVideoTracks().length);
      return stream;
    }

    function getSharedScreen(): { track: MediaStreamTrack; stream: MediaStream } | null {
      const stream = screenStreamRef.current;
      const track = stream?.getVideoTracks()[0];
      return stream && track ? { track, stream } : null;
    }

    function toggleMic(): void {
      const track = streamRef.current?.getAudioTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
      optRef.current.onMediaState({ audio: track.enabled });
    }

    function toggleCam(): void {
      const track = streamRef.current?.getVideoTracks()[0];
      if (!track) return;
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
      optRef.current.onMediaState({ video: track.enabled });
    }

    function stopShare(): void {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      optRef.current.onSetScreen(null, null, cameraTrackRef.current);
      // Restore the camera preview (or nothing, if watch-only).
      setLocalStream(streamRef.current);
      sharingRef.current = false;
      setSharing(false);
    }

    async function toggleShare(): Promise<void> {
      if (sharingRef.current) {
        stopShare();
        return;
      }
      let screen: MediaStream;
      try {
        screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
      } catch {
        // user cancelled the picker (or no permission) — nothing to do
        return;
      }
      const screenTrack = screen.getVideoTracks()[0];
      if (!screenTrack) return;
      screenStreamRef.current = screen;
      optRef.current.onSetScreen(screenTrack, screen, cameraTrackRef.current);
      // Local preview shows the shared screen.
      setLocalStream(screen);
      sharingRef.current = true;
      setSharing(true);
      // Browser's own "stop sharing" button.
      screenTrack.onended = () => stopShare();
    }

    function cleanup(): void {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    }

    apiRef.current = { streamRef, getSharedScreen, acquire, toggleMic, toggleCam, toggleShare, cleanup };
  }

  return { localStream, micOn, camOn, sharing, ...apiRef.current };
}
