import { useCallback, useEffect, useState } from "react";

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

// Enumerates available input/output devices and keeps the list fresh on
// hot-plug. Device ids/labels are hidden until media permission is granted, so
// `refresh(true)` will prompt for permission (call it from a user gesture, e.g.
// opening the device picker) to unlock the full list.
export function useMediaDevices(): Devices & { refresh: (unlock?: boolean) => Promise<void> } {
  const [devices, setDevices] = useState<Devices>({ cameras: [], mics: [], speakers: [] });

  const refresh = useCallback(async (unlock = false) => {
    try {
      let list = await navigator.mediaDevices.enumerateDevices();
      // Nothing usable yet (no permission) — ask for it, then re-enumerate.
      if (unlock && !list.some((d) => d.deviceId)) {
        const tmp =
          (await navigator.mediaDevices.getUserMedia({ audio: true, video: true }).catch(() => null)) ??
          (await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => null)) ??
          (await navigator.mediaDevices.getUserMedia({ video: true }).catch(() => null));
        tmp?.getTracks().forEach((t) => t.stop());
        list = await navigator.mediaDevices.enumerateDevices();
      }
      const pick = (kind: MediaDeviceKind, fallback: string): DeviceInfo[] =>
        list
          .filter((d) => d.kind === kind && d.deviceId)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
      setDevices({
        cameras: pick("videoinput", "Kamera"),
        mics: pick("audioinput", "Mikrofon"),
        speakers: pick("audiooutput", "Hoparlör"),
      });
    } catch {
      // enumerateDevices unavailable/blocked — leave lists as-is
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    navigator.mediaDevices.addEventListener("devicechange", onChange);
    return () => navigator.mediaDevices.removeEventListener("devicechange", onChange);
  }, [refresh]);

  return { ...devices, refresh };
}
