import { useEffect, useRef } from "react";
import { IconMicrophoneOff } from "@tabler/icons-react";

interface Props {
  stream: MediaStream | null;
  name: string;
  self?: boolean;
  muted?: boolean;
  audioOff?: boolean;
  videoOff?: boolean;
  sharing?: boolean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function VideoTile({
  stream,
  name,
  self,
  muted,
  audioOff,
  videoOff,
  sharing,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (ref.current && ref.current.srcObject !== stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-800/60 ring-1 ring-white/5">
      <video
        ref={ref}
        autoPlay
        playsInline
        muted={muted}
        className={`h-full w-full bg-slate-900 ${
          sharing ? "object-contain" : "object-cover"
        } ${videoOff ? "hidden" : ""} ${self && !sharing ? "-scale-x-100" : ""}`}
      />

      {videoOff && (
        <div className="flex h-full w-full items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-500/20 text-2xl font-semibold text-indigo-200">
            {initials(name)}
          </div>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-sm">
        {audioOff && (
          <IconMicrophoneOff size={16} className="shrink-0 text-red-400" aria-label="Mikrofon kapalı" />
        )}
        <span className="truncate font-medium text-white">
          {name}
          {self && " (sen)"}
        </span>
      </div>
    </div>
  );
}
