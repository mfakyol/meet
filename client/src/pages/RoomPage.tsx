import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../lib/useRoom";
import { VideoTile } from "../components/VideoTile";
import { ChatPanel } from "../components/ChatPanel";

function gridCols(total: number): number {
  if (total <= 1) return 1;
  if (total <= 4) return 2;
  if (total <= 9) return 3;
  return 4;
}

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

function Room({
  roomId,
  name,
  onLeave,
}: {
  roomId: string;
  name: string;
  onLeave: () => void;
}) {
  const room = useRoom(roomId, name);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const total = room.peers.length + 1;
  const cols = gridCols(total);

  function copyLink() {
    void navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">Oda: {roomId}</div>
          <div className="text-xs text-slate-400">
            {total} katılımcı
            {room.status === "connecting" && " · bağlanıyor…"}
          </div>
        </div>
        <button
          onClick={copyLink}
          className="shrink-0 rounded-lg border border-white/15 px-3 py-1.5 text-sm hover:bg-white/5"
        >
          {copied ? "Kopyalandı ✓" : "Linki kopyala"}
        </button>
      </header>

      {room.error && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
          {room.error}
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto p-4">
          <div
            className="mx-auto grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              maxWidth: cols >= 3 ? "100%" : "1100px",
            }}
          >
            <VideoTile
              stream={room.localStream}
              name={name}
              self
              muted
              audioOff={!room.micOn}
              videoOff={!room.camOn && !room.sharing}
              sharing={room.sharing}
            />
            {room.peers.map((p) => (
              <VideoTile
                key={p.id}
                stream={p.stream}
                name={p.name}
                audioOff={!p.audio}
                videoOff={!p.video}
              />
            ))}
          </div>
        </main>

        {chatOpen && (
          <ChatPanel
            messages={room.messages}
            onSend={room.sendChat}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      <footer className="flex items-center justify-center gap-3 border-t border-white/10 px-4 py-4">
        <ControlButton
          onClick={room.toggleMic}
          active={room.micOn}
          title={room.micOn ? "Mikrofonu kapat" : "Mikrofonu aç"}
        >
          {room.micOn ? "🎤" : "🔇"}
        </ControlButton>
        <ControlButton
          onClick={room.toggleCam}
          active={room.camOn}
          title={room.camOn ? "Kamerayı kapat" : "Kamerayı aç"}
        >
          {room.camOn ? "📷" : "🚫"}
        </ControlButton>
        <ControlButton
          onClick={room.toggleShare}
          active={!room.sharing}
          title={room.sharing ? "Paylaşımı durdur" : "Ekranı paylaş"}
        >
          🖥️
        </ControlButton>
        <ControlButton
          onClick={() => setChatOpen((v) => !v)}
          active={!chatOpen}
          title="Sohbet"
        >
          💬
        </ControlButton>
        <ControlButton onClick={onLeave} danger title="Görüşmeden ayrıl">
          📞
        </ControlButton>
      </footer>
    </div>
  );
}

function NameGate({
  roomId,
  onJoin,
}: {
  roomId: string;
  onJoin: (name: string) => void;
}) {
  const [name, setName] = useState(() => sessionStorage.getItem("meet:name") ?? "");

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (n) {
      sessionStorage.setItem("meet:name", n);
      onJoin(n);
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-center"
      >
        <h1 className="text-lg font-semibold">Odaya katıl</h1>
        <p className="text-sm text-slate-400">Oda: {roomId}</p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Görünen adın"
          className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 text-center outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-2.5 font-semibold text-white disabled:opacity-40"
        >
          Katıl
        </button>
      </form>
    </div>
  );
}

export default function RoomPage() {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [name, setName] = useState<string | null>(() =>
    sessionStorage.getItem("meet:name")
  );

  // Remount the room fresh per join by keying on name+roomId.
  const key = useMemo(() => `${roomId}:${name}`, [roomId, name]);

  if (!name) {
    return <NameGate roomId={roomId} onJoin={setName} />;
  }

  return (
    <Room key={key} roomId={roomId} name={name} onLeave={() => navigate("/")} />
  );
}
