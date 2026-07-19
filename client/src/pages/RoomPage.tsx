import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "@/hooks/useRoom";
import { VideoTile } from "@/components/room/VideoTile";
import { ChatPanel } from "@/components/room/ChatPanel";
import { RoomControls } from "@/components/room/RoomControls";
import { NameGate } from "@/components/room/NameGate";

function gridCols(total: number): number {
  if (total <= 1) return 1;
  if (total <= 4) return 2;
  if (total <= 9) return 3;
  return 4;
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

      <RoomControls
        micOn={room.micOn}
        camOn={room.camOn}
        sharing={room.sharing}
        chatOpen={chatOpen}
        onToggleMic={room.toggleMic}
        onToggleCam={room.toggleCam}
        onToggleShare={room.toggleShare}
        onToggleChat={() => setChatOpen((v) => !v)}
        onLeave={onLeave}
      />
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
