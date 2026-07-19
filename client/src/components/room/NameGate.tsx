import { useState, type FormEvent } from "react";

interface Props {
  roomId: string;
  onJoin: (name: string) => void;
}

// Asks for a display name before entering a room (persists it for next time).
export function NameGate({ roomId, onJoin }: Props) {
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
