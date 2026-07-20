import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

export interface DeviceInfo {
  deviceId: string;
  label: string;
}

interface Devices {
  cameras: DeviceInfo[];
  mics: DeviceInfo[];
  speakers: DeviceInfo[];
}

// True if the browser can route audio output to a chosen device.
export const canPickSpeaker =
  typeof HTMLMediaElement !== "undefined" && "setSinkId" in HTMLMediaElement.prototype;

// `navigator.mediaDevices` is undefined in insecure contexts (e.g. plain HTTP
// over a LAN IP on mobile). Guard every access so the app never crashes there.
function md(): MediaDevices | undefined {
  return typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
}

// Enumerates available input/output devices and keeps the list fresh on
// hot-plug. Device ids/labels are hidden until media permission is granted, so
// `refresh(true)` will prompt for permission (call it from a user gesture).
export function useMediaDevices(): Devices & { refresh: (unlock?: boolean) => Promise<void> } {
  const [devices, setDevices] = useState<Devices>({ cameras: [], mics: [], speakers: [] });
  const { t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  const refresh = useCallback(async (unlock = false) => {
    const dev = md();
    if (!dev?.enumerateDevices) return;
    try {
      let list = await dev.enumerateDevices();
      // Nothing usable yet (no permission) — ask for it once, then re-enumerate.
      // Stop on an explicit denial so we don't prompt again.
      if (unlock && dev.getUserMedia && !list.some((d) => d.deviceId)) {
        let tmp: MediaStream | null = null;
        for (const c of [{ audio: true, video: true }, { audio: true }, { video: true }]) {
          try {
            tmp = await dev.getUserMedia(c);
            break;
          } catch (err) {
            const name = err instanceof DOMException ? err.name : "";
            if (name === "NotAllowedError" || name === "SecurityError") break;
          }
        }
        tmp?.getTracks().forEach((t) => t.stop());
        list = await dev.enumerateDevices();
      }
      const pick = (kind: MediaDeviceKind, fallback: string): DeviceInfo[] =>
        list
          .filter((d) => d.kind === kind && d.deviceId)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
      setDevices({
        cameras: pick("videoinput", tRef.current("devices.camera")),
        mics: pick("audioinput", tRef.current("devices.mic")),
        speakers: pick("audiooutput", tRef.current("devices.speaker")),
      });
    } catch {
      // enumerateDevices unavailable/blocked — leave lists as-is
    }
  }, []);

  useEffect(() => {
    const dev = md();
    if (!dev) return;
    void refresh();
    const onChange = () => void refresh();
    dev.addEventListener?.("devicechange", onChange);
    return () => dev.removeEventListener?.("devicechange", onChange);
  }, [refresh]);

  return { ...devices, refresh };
}
