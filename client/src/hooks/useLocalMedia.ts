import { useRef, useState, type RefObject } from "react";

interface Options {
  /** Mic/cam toggled — broadcast the new state to the room. */
  onMediaState: (patch: { audio?: boolean; video?: boolean }) => void;
  /**
   * Screen-share started (screenTrack set) or stopped (null). The peer layer
   * sends/removes the screen as a separate track; the camera is left untouched.
   */
  onSetScreen: (
    screenTrack: MediaStreamTrack | null,
    screenStream: MediaStream | null
  ) => void;
  /** A camera/mic device was switched — swap the track on every connection. */
  onReplaceTrack: (
    oldTrack: MediaStreamTrack | null,
    newTrack: MediaStreamTrack,
    stream: MediaStream
  ) => void;
  /** Surface a user-facing error (media denied, …). */
  onError: (message: string) => void;
}

export interface LocalMedia {
  localStream: MediaStream | null;
  /** The screen we're sharing (own preview tile), or null. */
  localScreen: MediaStream | null;
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  /** Active camera/mic device ids (for the device pickers). */
  cameraId: string | null;
  micId: string | null;
  /** The live camera/mic stream, readable synchronously by the peer layer. */
  streamRef: RefObject<MediaStream | null>;
  /** The screen currently being shared, if any (for peers joining mid-share). */
  getSharedScreen: () => { track: MediaStreamTrack; stream: MediaStream } | null;
  /** Acquire camera+mic once. Resolves to the stream (or null if denied). */
  acquire: () => Promise<MediaStream | null>;
  toggleMic: () => void;
  toggleCam: () => void;
  toggleShare: () => Promise<void>;
  /** Switch the active camera / microphone device. */
  setCamera: (deviceId: string) => Promise<void>;
  setMic: (deviceId: string) => Promise<void>;
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
  const screenStreamRef = useRef<MediaStream | null>(null);
  const sharingRef = useRef(false);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreen, setLocalScreen] = useState<MediaStream | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [sharing, setSharing] = useState(false);
  const [cameraId, setCameraId] = useState<string | null>(null);
  const [micId, setMicId] = useState<string | null>(null);
  const apiRef =
    useRef<
      | Omit<
          LocalMedia,
          "localStream" | "localScreen" | "micOn" | "camOn" | "sharing" | "cameraId" | "micId"
        >
      | undefined
    >(undefined);

  if (!apiRef.current) {
    async function acquire(): Promise<MediaStream | null> {
      let stream: MediaStream | null = null;
      const tryGet = async (c: MediaStreamConstraints) => {
        try {
          return await navigator.mediaDevices.getUserMedia(c);
        } catch {
          return null;
        }
      };
      // Prefer camera + mic, but degrade gracefully: a missing camera shouldn't
      // also cost the microphone (and vice versa).
      stream =
        (await tryGet({ video: true, audio: true })) ??
        (await tryGet({ audio: true })) ??
        (await tryGet({ video: true }));
      if (!stream) {
        optRef.current.onError("Kamera/mikrofon açılamadı — sadece izleme modunda katıldın.");
      }
      streamRef.current = stream;
      setLocalStream(stream);
      setMicOn(!!stream?.getAudioTracks().length);
      setCamOn(!!stream?.getVideoTracks().length);
      setCameraId(stream?.getVideoTracks()[0]?.getSettings().deviceId ?? null);
      setMicId(stream?.getAudioTracks()[0]?.getSettings().deviceId ?? null);
      return stream;
    }

    // Switch a camera/mic device: acquire the chosen device, rebuild the local
    // stream keeping the other track, and swap the track on every connection.
    async function switchDevice(kind: "video" | "audio", deviceId: string): Promise<void> {
      const cur = streamRef.current;
      const oldTrack =
        (kind === "video" ? cur?.getVideoTracks()[0] : cur?.getAudioTracks()[0]) ?? null;
      let fresh: MediaStream;
      try {
        fresh = await navigator.mediaDevices.getUserMedia(
          kind === "video" ? { video: { deviceId: { exact: deviceId } } } : { audio: { deviceId: { exact: deviceId } } }
        );
      } catch {
        optRef.current.onError(kind === "video" ? "Kamera değiştirilemedi." : "Mikrofon değiştirilemedi.");
        return;
      }
      const newTrack = (kind === "video" ? fresh.getVideoTracks()[0] : fresh.getAudioTracks()[0]) ?? null;
      if (!newTrack) return;
      // Preserve the on/off state of the track being replaced.
      newTrack.enabled = oldTrack ? oldTrack.enabled : true;

      const kept =
        kind === "video" ? cur?.getAudioTracks() ?? [] : cur?.getVideoTracks() ?? [];
      const combined = new MediaStream(kind === "video" ? [newTrack, ...kept] : [...kept, newTrack]);

      oldTrack?.stop();
      streamRef.current = combined;
      setLocalStream(combined);
      optRef.current.onReplaceTrack(oldTrack, newTrack, combined);

      if (kind === "video") {
        setCamOn(newTrack.enabled);
        setCameraId(deviceId);
      } else {
        setMicOn(newTrack.enabled);
        setMicId(deviceId);
      }
    }

    const setCamera = (deviceId: string) => switchDevice("video", deviceId);
    const setMic = (deviceId: string) => switchDevice("audio", deviceId);

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
      optRef.current.onSetScreen(null, null);
      setLocalScreen(null);
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
      // Screen is a separate track — the camera preview stays as-is.
      optRef.current.onSetScreen(screenTrack, screen);
      setLocalScreen(screen);
      sharingRef.current = true;
      setSharing(true);
      // Browser's own "stop sharing" button.
      screenTrack.onended = () => stopShare();
    }

    function cleanup(): void {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    }

    apiRef.current = {
      streamRef,
      getSharedScreen,
      acquire,
      toggleMic,
      toggleCam,
      toggleShare,
      setCamera,
      setMic,
      cleanup,
    };
  }

  return { localStream, localScreen, micOn, camOn, sharing, cameraId, micId, ...apiRef.current };
}
