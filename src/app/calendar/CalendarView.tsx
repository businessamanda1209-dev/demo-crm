"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

type Attendee = { id: string; name: string; email: string | null };
type Meeting = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
  meetingLink: string;
  attendees: Attendee[];
};

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  DONE: "Concluído",
  CANCELLED: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  DONE: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  CANCELLED: "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700",
};

const EMPTY_FORM = {
  id: undefined as string | undefined,
  title: "",
  description: "",
  startAt: "",
  endAt: "",
  status: "SCHEDULED",
  attendeesRaw: "",
};

function toLocalDatetimeValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getDayKey(iso: string) {
  return iso.slice(0, 10);
}

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function CalendarView({ initialMeetings }: { initialMeetings: Meeting[] }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [viewYear, setViewYear] = useState(now.getFullYear());

  const meetingsByDay = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach((m) => {
      const key = getDayKey(m.startAt);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [meetings]);

  const calendarDays = useMemo(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(viewYear, viewMonth, d));
    return days;
  }, [viewMonth, viewYear]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const selectedMeetings = selectedDay ? (meetingsByDay[selectedDay] ?? []) : [];

  function openNew(day?: string) {
    const base = day ? `${day}T09:00` : "";
    const baseEnd = day ? `${day}T10:00` : "";
    setForm({ ...EMPTY_FORM, startAt: base, endAt: baseEnd });
    setError(null); setOpen(true);
  }

  function openEdit(m: Meeting) {
    setForm({
      id: m.id, title: m.title, description: m.description ?? "",
      startAt: toLocalDatetimeValue(m.startAt), endAt: toLocalDatetimeValue(m.endAt),
      status: m.status,
      attendeesRaw: m.attendees.map((a) => a.email ? `${a.name} <${a.email}>` : a.name).join(", "),
    });
    setError(null); setOpen(true);
  }

  function parseAttendees(raw: string): { name: string; email?: string }[] {
    return raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
      const match = s.match(/^(.+?)\s*<([^>]+)>$/);
      if (match) return { name: match[1].trim(), email: match[2].trim() };
      return { name: s };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const isEdit = !!form.id;
    const attendees = parseAttendees(form.attendeesRaw);
    const res = await fetch(isEdit ? `/api/meetings/${form.id}` : "/api/meetings", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description || null,
        startAt: form.startAt, endAt: form.endAt, status: form.status,
        attendees: isEdit ? undefined : attendees,
      }),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    setOpen(false);
    router.refresh();
    if (!isEdit) {
      const created = await res.json();
      setMeetings((prev) => [...prev, created]);
    } else {
      setMeetings((prev) => prev.map((m) => m.id === form.id
        ? { ...m, title: form.title, description: form.description || null, startAt: new Date(form.startAt).toISOString(), endAt: new Date(form.endAt).toISOString(), status: form.status }
        : m));
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta reunião?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeetings.length <= 1) setSelectedDay(null);
  }

  const todayKey = getDayKey(new Date().toISOString());

  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Gerencie reuniões e compromissos."
        actions={<button onClick={() => openNew()} className="btn-primary">+ Nova reunião</button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-2 card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">{MONTHS[viewMonth]} {viewYear}</h2>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAYS.map((w) => (
              <div key={w} className="text-center text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide py-1">{w}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => {
              if (!day) return <div key={`e-${i}`} />;
              const key = getDayKey(day.toISOString());
              const isToday = key === todayKey;
              const hasMeetings = !!meetingsByDay[key];
              const isSelected = selectedDay === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`relative flex flex-col items-center justify-start pt-1 pb-1 rounded-xl text-sm h-14 transition
                    ${isSelected ? "bg-brand-500 text-white" : isToday ? "bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 font-semibold" : "hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300"}`}
                >
                  <span className={`text-xs font-medium ${isSelected ? "text-white" : ""}`}>{day.getDate()}</span>
                  {hasMeetings && (
                    <span className={`mt-1 inline-flex gap-0.5`}>
                      {(meetingsByDay[key].slice(0, 3)).map((_, idx) => (
                        <span key={idx} className={`w-1 h-1 rounded-full ${isSelected ? "bg-white/80" : "bg-brand-400"}`} />
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Day detail panel */}
        <div className="card p-5 flex flex-col">
          {selectedDay ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">
                  {new Date(selectedDay + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
                </h3>
                <button onClick={() => openNew(selectedDay)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">+ Reunião</button>
              </div>
              {selectedMeetings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
                  <p className="text-sm text-slate-400 dark:text-neutral-500">Nenhuma reunião neste dia.</p>
                </div>
              ) : (
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {selectedMeetings.map((m) => (
                    <div key={m.id} className="rounded-xl border border-slate-100 dark:border-neutral-800 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 dark:text-neutral-100 truncate">{m.title}</p>
                          <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                            {new Date(m.startAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} – {new Date(m.endAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          {m.description && <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 line-clamp-2">{m.description}</p>}
                          {m.attendees.length > 0 && (
                            <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">{m.attendees.length} participante{m.attendees.length !== 1 ? "s" : ""}</p>
                          )}
                        </div>
                        <span className={`pill shrink-0 ${STATUS_COLORS[m.status] ?? ""}`}>{STATUS_LABELS[m.status] ?? m.status}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-50 dark:border-neutral-800/60">
                        <a href={`/meet/${m.meetingLink}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700">Entrar</a>
                        <button onClick={() => openEdit(m)} className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700">Editar</button>
                        <button onClick={() => remove(m.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-400 dark:text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-neutral-300">Selecione um dia</p>
              <p className="text-xs text-slate-400 dark:text-neutral-500 mt-1">Clique em uma data para ver as reuniões.</p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming meetings list */}
      <div className="mt-6 card overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">Próximas reuniões</h3>
        </div>
        {meetings.filter((m) => m.status !== "CANCELLED" && m.status !== "DONE").length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhuma reunião agendada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Título</th>
                <th className="table-th">Início</th>
                <th className="table-th">Término</th>
                <th className="table-th">Participantes</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {meetings
                .filter((m) => m.status !== "CANCELLED" && m.status !== "DONE")
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
                .map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                    <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{m.title}</td>
                    <td className="table-td text-slate-500 dark:text-neutral-400">{formatDateTime(m.startAt)}</td>
                    <td className="table-td text-slate-500 dark:text-neutral-400">{formatDateTime(m.endAt)}</td>
                    <td className="table-td text-slate-500 dark:text-neutral-400">{m.attendees.length || "—"}</td>
                    <td className="table-td"><span className={`pill ${STATUS_COLORS[m.status] ?? ""}`}>{STATUS_LABELS[m.status] ?? m.status}</span></td>
                    <td className="table-td text-right">
                      <a href={`/meet/${m.meetingLink}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Entrar</a>
                      <button onClick={() => openEdit(m)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Editar</button>
                      <button onClick={() => remove(m.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Reunião" : "Nova Reunião"}>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div>
            <label className="label">Título *</label>
            <input className="input" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Início *</label>
              <input className="input" type="datetime-local" required value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} />
            </div>
            <div>
              <label className="label">Término *</label>
              <input className="input" type="datetime-local" required value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descrição</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          {!form.id && (
            <div>
              <label className="label">Participantes</label>
              <input className="input" placeholder="Nome <email@exemplo.com>, Nome2" value={form.attendeesRaw} onChange={(e) => setForm({ ...form, attendeesRaw: e.target.value })} />
              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Separe por vírgula. Formato: Nome {"<email>"} ou só Nome.</p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : form.id ? "Salvar" : "Criar reunião"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
