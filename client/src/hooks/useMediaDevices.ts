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
// hot-plug. Labels are only populated once media permission has been granted.
export function useMediaDevices(): Devices & { refresh: () => void } {
  const [devices, setDevices] = useState<Devices>({ cameras: [], mics: [], speakers: [] });

  const refresh = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const pick = (kind: MediaDeviceKind, fallback: string): DeviceInfo[] =>
        list
          .filter((d) => d.kind === kind)
          .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `${fallback} ${i + 1}` }));
      setDevices({
        cameras: pick("videoinput", "Kamera"),
        mics: pick("audioinput", "Mikrofon"),
        speakers: pick("audiooutput", "Hoparlör"),
      });
    } catch {
      // enumerateDevices unavailable/blocked — leave lists empty
    }
  }, []);

  useEffect(() => {
    void refresh();
    navigator.mediaDevices.addEventListener("devicechange", refresh);
    return () => navigator.mediaDevices.removeEventListener("devicechange", refresh);
  }, [refresh]);

  return { ...devices, refresh };
}
