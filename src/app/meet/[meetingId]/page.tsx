"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

type Participant = { id: string; name: string; muted: boolean; videoOff: boolean; isMe: boolean };
type MeetingInfo = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  isAllDay: boolean;
  location: string | null;
  meetingLink: string;
  timezone: string;
  organizer: string;
};

export default function MeetPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const [phase, setPhase] = useState<"lobby" | "room">("lobby");
  const [name, setName] = useState("");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [chat, setChat] = useState<{ from: string; text: string; ts: string }[]>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [leaving, setLeaving] = useState(false);
  const [info, setInfo] = useState<MeetingInfo | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!meetingId) return;
    fetch(`/api/meetings/public/${meetingId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data && !data.error) setInfo(data); })
      .catch(() => {});
  }, [meetingId]);

  async function joinRoom() {
    if (!name.trim()) return;
    const me: Participant = { id: "me", name: name.trim(), muted, videoOff, isMe: true };
    setParticipants([me]);
    setPhase("room");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: !videoOff, audio: !muted });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      // camera/mic not available — continue without stream
    }
  }

  function leave() {
    setLeaving(true);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setTimeout(() => { window.location.href = "/calendar"; }, 800);
  }

  function toggleMute() {
    setMuted((v) => {
      const next = !v;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      setParticipants((prev) => prev.map((p) => p.isMe ? { ...p, muted: next } : p));
      return next;
    });
  }

  function toggleVideo() {
    setVideoOff((v) => {
      const next = !v;
      streamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !next; });
      setParticipants((prev) => prev.map((p) => p.isMe ? { ...p, videoOff: next } : p));
      return next;
    });
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChat((prev) => [...prev, { from: name || "Você", text: chatInput.trim(), ts: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) }]);
    setChatInput("");
  }

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  if (leaving) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-neutral-900 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </div>
          <p className="text-white font-semibold">Você saiu da reunião</p>
          <p className="text-neutral-500 text-sm mt-1">Redirecionando para a agenda...</p>
        </div>
      </div>
    );
  }

  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500/10 mb-4">
              <svg className="w-7 h-7 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-white">{info?.title || "Entrar na reunião"}</h1>
            {info ? (
              <>
                <p className="text-neutral-400 text-sm mt-1.5">
                  {info.isAllDay
                    ? new Date(info.startAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })
                    : `${new Date(info.startAt).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })} · ${new Date(info.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – ${new Date(info.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`}
                </p>
                <p className="text-neutral-600 text-xs mt-1">
                  Organizado por <span className="text-brand-400 font-semibold">{info.organizer}</span>
                </p>
              </>
            ) : (
              <p className="text-neutral-500 text-sm mt-1 font-mono break-all">{meetingId}</p>
            )}
          </div>

          <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800 space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Seu nome</label>
              <input
                className="w-full rounded-xl border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Digite seu nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={toggleMute}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium border transition ${muted ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"}`}
              >
                {muted ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
                )}
                {muted ? "Mic off" : "Mic on"}
              </button>
              <button
                onClick={toggleVideo}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium border transition ${videoOff ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"}`}
              >
                {videoOff ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                )}
                {videoOff ? "Câm off" : "Câm on"}
              </button>
            </div>

            <button
              onClick={joinRoom}
              disabled={!name.trim()}
              className="w-full rounded-xl py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white text-sm font-semibold transition"
            >
              Entrar na reunião
            </button>
          </div>

          <div className="text-center mt-4 space-y-1">
            <a
              href={`/api/meetings/public/${meetingId}/ics`}
              download
              className="inline-block text-xs text-brand-400 hover:text-brand-300 underline"
            >
              Baixar .ics e adicionar à sua agenda
            </a>
            <p className="text-xs text-neutral-600">
              Powered by <span className="text-brand-500 font-semibold">Liba+</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          <span className="text-lg font-black text-white tracking-tight">LIBA<span className="text-brand-500">+</span></span>
          <span className="text-neutral-600">|</span>
          <span className="text-sm text-neutral-400 font-mono">{meetingId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {participants.length} participante{participants.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4 grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignContent: "start" }}>
          {/* My video */}
          <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 aspect-video flex items-center justify-center">
            {!videoOff ? (
              <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-brand-500/20 flex items-center justify-center">
                  <span className="text-xl font-bold text-brand-400">{name.charAt(0).toUpperCase()}</span>
                </div>
                <span className="text-xs text-neutral-500">Câmera desativada</span>
              </div>
            )}
            <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
              <span className="text-xs font-medium text-white bg-black/50 rounded-lg px-2 py-0.5">{name} (você)</span>
              {muted && (
                <span className="w-5 h-5 rounded-full bg-rose-500/80 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
                </span>
              )}
            </div>
          </div>

          {/* Waiting for others placeholder */}
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800 border-dashed aspect-video flex flex-col items-center justify-center gap-2">
            <svg className="w-8 h-8 text-neutral-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            <p className="text-xs text-neutral-600">Aguardando outros participantes...</p>
          </div>
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <div className="w-72 bg-neutral-900 border-l border-neutral-800 flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Chat</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {chat.length === 0 ? (
                <p className="text-xs text-neutral-600 text-center py-6">Nenhuma mensagem ainda.</p>
              ) : (
                chat.map((msg, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-semibold text-neutral-300">{msg.from}</span>
                    <span className="text-neutral-600 text-[10px] ml-1">{msg.ts}</span>
                    <p className="text-neutral-400 mt-0.5">{msg.text}</p>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendChat} className="flex gap-2 px-3 py-3 border-t border-neutral-800">
              <input
                className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                placeholder="Mensagem..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
              />
              <button type="submit" className="w-8 h-8 rounded-lg bg-brand-500 hover:bg-brand-600 flex items-center justify-center transition">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-3 px-6 py-4 bg-neutral-900 border-t border-neutral-800">
        <button
          onClick={toggleMute}
          className={`flex flex-col items-center gap-1 w-14 h-14 rounded-2xl border transition ${muted ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"}`}
        >
          {muted ? (
            <svg className="w-5 h-5 mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>
          ) : (
            <svg className="w-5 h-5 mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" /></svg>
          )}
        </button>

        <button
          onClick={toggleVideo}
          className={`flex flex-col items-center gap-1 w-14 h-14 rounded-2xl border transition ${videoOff ? "bg-rose-500/20 border-rose-500/40 text-rose-400" : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"}`}
        >
          {videoOff ? (
            <svg className="w-5 h-5 mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M12 18.75H4.5a2.25 2.25 0 01-2.25-2.25V9m12.841 9.091L16.5 19.5m-1.409-1.409c.407-.407.659-.97.659-1.591v-9a2.25 2.25 0 00-2.25-2.25h-9c-.621 0-1.184.252-1.591.659m12.182 12.182L2.909 5.909M1.5 4.5l1.409 1.409" /></svg>
          ) : (
            <svg className="w-5 h-5 mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
          )}
        </button>

        <button
          onClick={() => setChatOpen((v) => !v)}
          className={`flex flex-col items-center gap-1 w-14 h-14 rounded-2xl border transition ${chatOpen ? "bg-brand-500/20 border-brand-500/40 text-brand-400" : "bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700"}`}
        >
          <svg className="w-5 h-5 mt-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
        </button>

        <div className="w-px h-8 bg-neutral-800 mx-1" />

        <button
          onClick={leave}
          className="flex items-center gap-2 px-5 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-semibold transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" /></svg>
          Sair
        </button>
      </div>
    </div>
  );
}
