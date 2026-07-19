import type { ReactNode } from "react";

function ControlButton({
  onClick,
  active,
  danger,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  title: string;
  children: ReactNode;
}) {
  const base =
    "flex h-12 w-12 items-center justify-center rounded-full text-xl transition select-none";
  const cls = danger
    ? "bg-red-600 text-white hover:bg-red-500"
    : active
      ? "bg-white/15 text-white hover:bg-white/25"
      : "bg-red-500/90 text-white hover:bg-red-500";
  return (
    <button onClick={onClick} title={title} className={`${base} ${cls}`}>
      {children}
    </button>
  );
}

interface Props {
  micOn: boolean;
  camOn: boolean;
  sharing: boolean;
  chatOpen: boolean;
  onToggleMic: () => void;
  onToggleCam: () => void;
  onToggleShare: () => void;
  onToggleChat: () => void;
  onLeave: () => void;
}

// The bottom control bar: mic, camera, screen-share, chat, leave.
export function RoomControls({
  micOn,
  camOn,
  sharing,
  chatOpen,
  onToggleMic,
  onToggleCam,
  onToggleShare,
  onToggleChat,
  onLeave,
}: Props) {
  return (
    <footer className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
      <ControlButton onClick={onToggleMic} active={micOn} title={micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}>
        {micOn ? "🎤" : "🔇"}
      </ControlButton>
      <ControlButton onClick={onToggleCam} active={camOn} title={camOn ? "Kamerayı kapat" : "Kamerayı aç"}>
        {camOn ? "📷" : "🚫"}
      </ControlButton>
      <ControlButton onClick={onToggleShare} active={!sharing} title={sharing ? "Paylaşımı durdur" : "Ekranı paylaş"}>
        🖥️
      </ControlButton>
      <ControlButton onClick={onToggleChat} active={!chatOpen} title="Sohbet">
        💬
      </ControlButton>
      <ControlButton onClick={onLeave} danger title="Görüşmeden ayrıl">
        📞
      </ControlButton>
    </footer>
  );
}
