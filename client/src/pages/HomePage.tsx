import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid";
import { extractRoomId } from "@/utils/roomId";

export default function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem("meet:name") ?? "");
  const [code, setCode] = useState("");

  function persistName() {
    const n = name.trim();
    if (n) sessionStorage.setItem("meet:name", n);
  }

  function createRoom() {
    persistName();
    navigate(`/room/${nanoid(10)}`);
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    persistName();
    // Accept a bare code or a full room URL; reject anything that isn't a safe slug.
    const id = extractRoomId(code);
    if (id) navigate(`/room/${id}`);
  }

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
            Meet
          </h1>
          <p className="mt-2 text-slate-400">
            Tarayıcıdan görüntülü görüşme — kurulum yok, linki paylaş, katıl.
          </p>
        </div>

        <div className="space-y-5 rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-xl">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-300">
              Görünen adın
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Adın"
              className="w-full rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 outline-none focus:border-indigo-500"
            />
          </label>

          <button
            onClick={createRoom}
            disabled={!name.trim()}
            className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-40"
          >
            Yeni oda oluştur
          </button>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="h-px flex-1 bg-white/10" />
            veya koda katıl
            <span className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={joinRoom} className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Oda kodu ya da linki"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2.5 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!name.trim() || !code.trim()}
              className="rounded-lg border border-white/15 px-4 py-2.5 font-medium text-slate-200 hover:bg-white/5 disabled:opacity-40"
            >
              Katıl
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-500">
          En fazla 8 kişi · uçtan uca P2P (medya sunucudan geçmez)
        </p>
      </div>
    </div>
  );
}
