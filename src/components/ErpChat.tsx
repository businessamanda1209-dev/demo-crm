"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  senderType: "CLIENT" | "OPERATOR" | "SYSTEM";
  content: string;
  createdAt: string;
};

export default function ErpChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && !loaded) {
      fetch("/api/erp/chat")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.messages)) setMessages(data.messages);
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [open, loaded]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const content = input.trim();
    setInput("");
    const res = await fetch("/api/erp/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages)) setMessages(data.messages);
    }
    setSending(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-all"
        aria-label="Abrir chat financeiro"
      >
        {open ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-80 sm:w-96 flex flex-col rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 overflow-hidden" style={{ height: "480px" }}>
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800 bg-brand-500">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Suporte Financeiro</p>
              <p className="text-[11px] text-brand-100">Liba Finance</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {!loaded && (
              <p className="text-center text-xs text-slate-400 dark:text-neutral-500 py-8">Carregando...</p>
            )}
            {loaded && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">Nenhuma mensagem ainda</p>
                <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">Envie uma mensagem para iniciar o atendimento.</p>
              </div>
            )}
            {messages.map((msg) => {
              const isClient = msg.senderType === "CLIENT";
              const isSystem = msg.senderType === "SYSTEM";
              if (isSystem) {
                return (
                  <div key={msg.id} className="flex justify-center">
                    <span className="text-[11px] text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-800 px-3 py-1 rounded-full">{msg.content}</span>
                  </div>
                );
              }
              return (
                <div key={msg.id} className={`flex ${isClient ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isClient ? "bg-brand-500 text-white rounded-br-sm" : "bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-100 rounded-bl-sm"}`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-0.5 ${isClient ? "text-brand-100 text-right" : "text-slate-400 dark:text-neutral-500"}`}>{formatTime(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form onSubmit={send} className="flex gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-800">
            <input
              className="flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 px-3 py-2 text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-400"
              placeholder="Digite sua mensagem..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500 hover:bg-brand-600 text-white disabled:opacity-50 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
