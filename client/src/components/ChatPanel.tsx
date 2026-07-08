import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "../lib/useRoom";

interface Props {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onClose: () => void;
}

export function ChatPanel({ messages, onSend, onClose }: Props) {
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSend(text);
    setText("");
  }

  return (
    <aside className="flex w-full flex-col border-l border-white/10 bg-slate-900/80 md:w-80">
      <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h2 className="font-semibold">Sohbet</h2>
        <button
          onClick={onClose}
          className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          ✕
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">Henüz mesaj yok.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={m.mine ? "text-right" : "text-left"}>
            {!m.mine && (
              <div className="mb-0.5 text-xs font-medium text-indigo-300">
                {m.name}
              </div>
            )}
            <div
              className={`inline-block max-w-[85%] break-words rounded-2xl px-3 py-2 text-sm ${
                m.mine
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-700/70 text-slate-100"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesaj yaz…"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-2 text-sm outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Gönder
        </button>
      </form>
    </aside>
  );
}
