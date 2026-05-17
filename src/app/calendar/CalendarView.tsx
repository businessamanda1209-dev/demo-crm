"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

// ── Types ─────────────────────────────────────────────────────────────────────

type Attendee = {
  id: string;
  name: string;
  email: string | null;
  responseStatus: string;
  canInviteOthers: boolean;
  canSeeGuestList: boolean;
};
type Meeting = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
  meetingLink: string;
  timezone: string;
  isAllDay: boolean;
  location: string | null;
  color: string | null;
  repeatRule: string | null;
  attendees: Attendee[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: "Agendado",
  IN_PROGRESS: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  IN_PROGRESS: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  COMPLETED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  CANCELLED: "bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700",
};
const MEETING_COLORS: Record<string, string> = {
  SCHEDULED: "bg-sky-500",
  IN_PROGRESS: "bg-amber-500",
  COMPLETED: "bg-emerald-500",
  CANCELLED: "bg-neutral-500",
};
const REPEAT_OPTIONS = ["Não se repete", "Diariamente", "Semanalmente", "Mensalmente", "Anualmente"];
const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HOUR_H = 56; // px per hour in week/day views

// ── Empty form ────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  id: undefined as string | undefined,
  title: "",
  description: "",
  startDate: "",
  startTime: "09:00",
  endDate: "",
  endTime: "10:00",
  isAllDay: false,
  status: "SCHEDULED",
  timezone: "America/Sao_Paulo",
  location: "",
  repeatRule: "Não se repete",
  videoEnabled: false,
  attendeesRaw: "",
  canInviteOthers: false,
  canSeeGuestList: true,
  color: "",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function toTimeStr(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function dayKey(iso: string) { return iso.slice(0, 10); }
function parseDT(date: string, time: string) {
  if (!date) return "";
  return `${date}T${time || "00:00"}`;
}
function parseAttendees(raw: string): { name: string; email?: string }[] {
  return raw.split(",").map(s => s.trim()).filter(Boolean).map(s => {
    const m = s.match(/^(.+?)\s*<([^>]+)>$/);
    if (m) return { name: m[1].trim(), email: m[2].trim() };
    if (s.includes("@")) return { name: s, email: s };
    return { name: s };
  });
}
function weekStart(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}
function addDays(d: Date, n: number) { return new Date(d.getTime() + n * 86400000); }
function formatHour(h: number) {
  if (h === 0) return "00h";
  if (h === 12) return "12h";
  return h < 12 ? `${String(h).padStart(2, "0")}h` : `${String(h - 12).padStart(2, "0")}h`;
}
function formatTimePT(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function formatDateLong(d: Date) {
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
}

// ── Component ─────────────────────────────────────────────────────────────────

type View = "month" | "week" | "day";

export default function CalendarView({ initialMeetings }: { initialMeetings: Meeting[] }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState(initialMeetings);
  const [view, setView] = useState<View>("month");
  const [currentDate, setCurrentDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const timegridRef = useRef<HTMLDivElement>(null);

  // Auto-scroll time grid to 7am on view change
  useEffect(() => {
    if ((view === "week" || view === "day") && timegridRef.current) {
      timegridRef.current.scrollTop = 7 * HOUR_H - 20;
    }
  }, [view]);

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goToday() { setCurrentDate(new Date()); }
  function goPrev() {
    setCurrentDate(d => {
      if (view === "month") return new Date(d.getFullYear(), d.getMonth() - 1, 1);
      if (view === "week") return addDays(d, -7);
      return addDays(d, -1);
    });
  }
  function goNext() {
    setCurrentDate(d => {
      if (view === "month") return new Date(d.getFullYear(), d.getMonth() + 1, 1);
      if (view === "week") return addDays(d, 7);
      return addDays(d, 1);
    });
  }

  // ── Header label ─────────────────────────────────────────────────────────────
  const navLabel = useMemo(() => {
    if (view === "month") return `${MONTHS_PT[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    if (view === "day") return formatDateLong(currentDate);
    const ws = weekStart(currentDate);
    const we = addDays(ws, 6);
    if (ws.getMonth() === we.getMonth()) return `${ws.getDate()}–${we.getDate()} ${MONTHS_PT[ws.getMonth()]} ${ws.getFullYear()}`;
    return `${ws.getDate()} ${MONTHS_PT[ws.getMonth()]} – ${we.getDate()} ${MONTHS_PT[we.getMonth()]} ${we.getFullYear()}`;
  }, [view, currentDate]);

  // ── Meetings mapped by day ────────────────────────────────────────────────────
  const byDay = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    meetings.forEach(m => {
      const k = dayKey(m.startAt);
      if (!map[k]) map[k] = [];
      map[k].push(m);
    });
    return map;
  }, [meetings]);

  // ── Open form helpers ─────────────────────────────────────────────────────────
  function openNew(date?: Date, hour?: number) {
    const d = date ?? currentDate;
    const ds = toDateStr(d);
    const h = hour ?? 9;
    setForm({
      ...EMPTY_FORM,
      startDate: ds,
      startTime: `${String(h).padStart(2, "0")}:00`,
      endDate: ds,
      endTime: `${String(h + 1).padStart(2, "0")}:00`,
    });
    setApiError(null);
    setOpen(true);
  }
  function openEdit(m: Meeting) {
    const s = new Date(m.startAt);
    const e = new Date(m.endAt);
    setForm({
      id: m.id,
      title: m.title,
      description: m.description ?? "",
      startDate: toDateStr(s),
      startTime: toTimeStr(s),
      endDate: toDateStr(e),
      endTime: toTimeStr(e),
      isAllDay: m.isAllDay,
      status: m.status,
      timezone: m.timezone,
      location: m.location ?? "",
      repeatRule: m.repeatRule ?? "Não se repete",
      videoEnabled: false,
      attendeesRaw: m.attendees.map(a => a.email ? `${a.name} <${a.email}>` : a.name).join(", "),
      canInviteOthers: m.attendees[0]?.canInviteOthers ?? false,
      canSeeGuestList: m.attendees[0]?.canSeeGuestList ?? true,
      color: m.color ?? "",
    });
    setApiError(null);
    setOpen(true);
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) { setApiError("Título obrigatório."); return; }
    if (!form.startDate) { setApiError("Data de início obrigatória."); return; }
    if (!form.endDate) { setApiError("Data de término obrigatória."); return; }
    setSubmitting(true); setApiError(null);
    const isEdit = !!form.id;
    const startAt = parseDT(form.startDate, form.isAllDay ? "00:00" : form.startTime);
    const endAt   = parseDT(form.endDate,   form.isAllDay ? "23:59" : form.endTime);
    const rawAttendees = parseAttendees(form.attendeesRaw);
    const attendees = rawAttendees.map(a => ({ ...a, canInviteOthers: form.canInviteOthers, canSeeGuestList: form.canSeeGuestList }));

    const res = await fetch(isEdit ? `/api/meetings/${form.id}` : "/api/meetings", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        description: form.description || null,
        startAt, endAt,
        status: form.status,
        timezone: form.timezone,
        isAllDay: form.isAllDay,
        location: form.location || null,
        repeatRule: form.repeatRule !== "Não se repete" ? form.repeatRule : null,
        color: form.color || null,
        attendees: isEdit ? undefined : attendees,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setApiError(data.error || "Erro ao salvar. Tente novamente.");
      return;
    }
    setOpen(false);
    router.refresh();
    if (!isEdit) {
      const created = await res.json();
      setMeetings(prev => [...prev, created]);
    } else {
      const s = new Date(startAt); const en = new Date(endAt);
      setMeetings(prev => prev.map(m => m.id === form.id
        ? { ...m, title: form.title, description: form.description || null, startAt: s.toISOString(), endAt: en.toISOString(), status: form.status, isAllDay: form.isAllDay, location: form.location || null }
        : m));
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta reunião?")) return;
    await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    setMeetings(prev => prev.filter(m => m.id !== id));
  }

  // ── MONTH VIEW ────────────────────────────────────────────────────────────────
  const monthDays = useMemo(() => {
    const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const last  = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), d));
    return days;
  }, [currentDate]);

  const todayKey = toDateStr(new Date());

  function renderMonthView() {
    return (
      <div className="card overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-slate-100 dark:border-neutral-800">
          {WEEKDAYS_SHORT.map(w => (
            <div key={w} className="py-2 text-center text-[11px] font-semibold text-slate-400 dark:text-neutral-500 uppercase tracking-wide">{w}</div>
          ))}
        </div>
        {/* Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-neutral-800">
          {monthDays.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="min-h-[100px] bg-slate-50/40 dark:bg-neutral-900/20" />;
            const k = toDateStr(day);
            const dayMeetings = byDay[k] ?? [];
            const isToday = k === todayKey;
            return (
              <div
                key={k}
                className="min-h-[100px] p-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-neutral-900/40 transition"
                onClick={() => { setCurrentDate(new Date(day)); setView("day"); }}
              >
                <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold mb-1 ${isToday ? "bg-brand-500 text-white" : "text-slate-700 dark:text-neutral-300"}`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayMeetings.slice(0, 3).map(m => (
                    <div
                      key={m.id}
                      onClick={ev => { ev.stopPropagation(); openEdit(m); }}
                      className={`truncate text-[11px] font-medium px-1.5 py-0.5 rounded text-white cursor-pointer ${MEETING_COLORS[m.status] ?? "bg-brand-500"}`}
                    >
                      {m.isAllDay ? "" : `${formatTimePT(m.startAt)} `}{m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <p className="text-[10px] text-slate-400 dark:text-neutral-500 pl-1">+{dayMeetings.length - 3} mais</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── WEEK/DAY SHARED ───────────────────────────────────────────────────────────
  function renderTimegrid(days: Date[]) {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    function meetingsForDay(d: Date) {
      const k = toDateStr(d);
      return (byDay[k] ?? []).filter(m => !m.isAllDay);
    }
    function allDayForDay(d: Date) {
      const k = toDateStr(d);
      return (byDay[k] ?? []).filter(m => m.isAllDay);
    }

    return (
      <div className="card overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 220px)" }}>
        {/* All-day row */}
        <div className="flex border-b border-slate-100 dark:border-neutral-800 bg-slate-50/60 dark:bg-neutral-900/40">
          <div className="w-14 shrink-0 text-[10px] text-slate-400 dark:text-neutral-600 flex items-center justify-center">Dia todo</div>
          {days.map(day => {
            const ads = allDayForDay(day);
            const isToday = toDateStr(day) === todayKey;
            return (
              <div key={toDateStr(day)} className="flex-1 min-w-0 p-1 border-l border-slate-100 dark:border-neutral-800">
                <div className={`text-center text-xs font-semibold mb-1 ${isToday ? "text-brand-500" : "text-slate-500 dark:text-neutral-400"}`}>
                  {days.length > 1 ? `${WEEKDAYS_SHORT[day.getDay()]} ${day.getDate()}` : formatDateLong(day)}
                </div>
                {ads.map(m => (
                  <div key={m.id} onClick={() => openEdit(m)} className={`truncate text-[11px] font-medium px-1.5 py-0.5 rounded text-white cursor-pointer mb-0.5 ${MEETING_COLORS[m.status] ?? "bg-brand-500"}`}>{m.title}</div>
                ))}
              </div>
            );
          })}
        </div>

        {/* Scrollable hourly grid */}
        <div ref={timegridRef} className="overflow-y-auto flex-1">
          <div className="flex" style={{ height: `${24 * HOUR_H}px`, position: "relative" }}>
            {/* Hour labels */}
            <div className="w-14 shrink-0 relative">
              {hours.map(h => (
                <div key={h} className="absolute left-0 right-0 text-right pr-2" style={{ top: h * HOUR_H - 8, height: HOUR_H }}>
                  <span className="text-[10px] text-slate-400 dark:text-neutral-600">{formatHour(h)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map(day => {
              const dayMs = meetingsForDay(day);
              const isToday = toDateStr(day) === todayKey;
              return (
                <div key={toDateStr(day)} className={`flex-1 min-w-0 relative border-l border-slate-100 dark:border-neutral-800 ${isToday ? "bg-brand-50/20 dark:bg-brand-500/5" : ""}`}>
                  {/* Hour lines */}
                  {hours.map(h => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-slate-100 dark:border-neutral-800 cursor-pointer hover:bg-brand-50/30 dark:hover:bg-brand-500/10 transition"
                      style={{ top: h * HOUR_H, height: HOUR_H }}
                      onClick={() => openNew(day, h)}
                    />
                  ))}
                  {/* Half-hour dashes */}
                  {hours.map(h => (
                    <div key={`hh-${h}`} className="absolute left-0 right-0 border-t border-dashed border-slate-50 dark:border-neutral-800/50 pointer-events-none" style={{ top: h * HOUR_H + HOUR_H / 2 }} />
                  ))}
                  {/* Meetings */}
                  {dayMs.map(m => {
                    const s = new Date(m.startAt);
                    const e = new Date(m.endAt);
                    const top = (s.getHours() + s.getMinutes() / 60) * HOUR_H;
                    const dur = Math.max((e.getTime() - s.getTime()) / 60000, 30);
                    const height = (dur / 60) * HOUR_H;
                    return (
                      <div
                        key={m.id}
                        onClick={ev => { ev.stopPropagation(); openEdit(m); }}
                        className={`absolute left-1 right-1 rounded-lg px-1.5 py-1 cursor-pointer overflow-hidden z-10 ${MEETING_COLORS[m.status] ?? "bg-brand-500"} bg-opacity-90 hover:bg-opacity-100 transition`}
                        style={{ top: top + 2, height: height - 4 }}
                      >
                        <p className="text-[11px] font-semibold text-white truncate">{m.title}</p>
                        {height > 32 && <p className="text-[10px] text-white/80">{formatTimePT(m.startAt)}–{formatTimePT(m.endAt)}</p>}
                      </div>
                    );
                  })}
                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date();
                    const topNow = (now.getHours() + now.getMinutes() / 60) * HOUR_H;
                    return (
                      <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: topNow }}>
                        <div className="h-0.5 bg-rose-500 relative">
                          <div className="absolute -left-1 -top-1.5 w-3 h-3 rounded-full bg-rose-500" />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderWeekView() {
    const ws = weekStart(currentDate);
    const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
    return renderTimegrid(days);
  }

  function renderDayView() {
    return renderTimegrid([currentDate]);
  }

  // ── Event form ────────────────────────────────────────────────────────────────
  function renderForm() {
    return (
      <form onSubmit={submit} className="space-y-4">
        {apiError && <p className="text-sm text-rose-500">{apiError}</p>}

        {/* Title */}
        <div>
          <input
            className="input text-base font-medium"
            placeholder="Adicionar título *"
            required
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
          />
        </div>

        {/* All-day toggle */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setForm({ ...form, isAllDay: !form.isAllDay })}
              className={`relative w-9 h-5 rounded-full transition-colors ${form.isAllDay ? "bg-brand-500" : "bg-slate-200 dark:bg-neutral-700"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isAllDay ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm text-slate-600 dark:text-neutral-400">O dia todo</span>
          </label>
          <span className="text-xs text-slate-400 dark:text-neutral-500">{form.timezone}</span>
        </div>

        {/* Date/time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Início *</label>
            <div className="flex gap-1.5">
              <input type="date" className="input flex-1" required value={form.startDate}
                onChange={e => setForm({ ...form, startDate: e.target.value, endDate: e.target.value })} />
              {!form.isAllDay && (
                <input type="time" className="input w-24" value={form.startTime}
                  onChange={e => setForm({ ...form, startTime: e.target.value })} />
              )}
            </div>
          </div>
          <div>
            <label className="label">Término *</label>
            <div className="flex gap-1.5">
              <input type="date" className="input flex-1" required value={form.endDate}
                onChange={e => setForm({ ...form, endDate: e.target.value })} />
              {!form.isAllDay && (
                <input type="time" className="input w-24" value={form.endTime}
                  onChange={e => setForm({ ...form, endTime: e.target.value })} />
              )}
            </div>
          </div>
        </div>

        {/* Repeat */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Repetição</label>
            <select className="input" value={form.repeatRule} onChange={e => setForm({ ...form, repeatRule: e.target.value })}>
              {REPEAT_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        {/* Video meeting */}
        <div className="rounded-xl border border-slate-200 dark:border-neutral-800 p-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
              <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-800 dark:text-neutral-200">Videoconferência Liba</p>
              {form.videoEnabled && <p className="text-[11px] text-brand-500">Link será gerado ao salvar</p>}
            </div>
          </div>
          <div
            onClick={() => setForm({ ...form, videoEnabled: !form.videoEnabled })}
            className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${form.videoEnabled ? "bg-brand-500" : "bg-slate-200 dark:bg-neutral-700"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.videoEnabled ? "translate-x-4" : ""}`} />
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="label">Local</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-neutral-500 pointer-events-none">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
            </span>
            <input className="input pl-9" placeholder="Adicionar local" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="label">Descrição</label>
          <textarea className="input" rows={2} placeholder="Adicionar descrição" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>

        {/* Guests */}
        <div>
          <label className="label">Convidados</label>
          <input className="input" placeholder="email@exemplo.com, Nome <email2@exemplo.com>" value={form.attendeesRaw} onChange={e => setForm({ ...form, attendeesRaw: e.target.value })} />
          <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">Separe por vírgula.</p>
          {form.attendeesRaw && (
            <div className="mt-2 space-y-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-neutral-400">
                <input type="checkbox" checked={form.canInviteOthers} onChange={e => setForm({ ...form, canInviteOthers: e.target.checked })} className="accent-brand-500" />
                Convidados podem convidar outras pessoas
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-neutral-400">
                <input type="checkbox" checked={form.canSeeGuestList} onChange={e => setForm({ ...form, canSeeGuestList: e.target.checked })} className="accent-brand-500" />
                Convidados podem ver a lista de convidados
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? "Salvando..." : form.id ? "Salvar" : "Criar reunião"}
          </button>
        </div>
      </form>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      <PageHeader
        title="Agenda"
        subtitle="Reuniões e compromissos."
        actions={
          <button onClick={() => openNew()} className="btn-primary">+ Nova reunião</button>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        {/* Today + prev/next */}
        <div className="flex items-center gap-2">
          <button onClick={goToday} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-neutral-700 text-slate-600 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-neutral-800 transition">
            Hoje
          </button>
          <button onClick={goPrev} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <button onClick={goNext} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-500 dark:text-neutral-400 transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
          </button>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-neutral-200 capitalize">{navLabel}</h2>
        </div>

        {/* M / W / D segmented control */}
        <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 backdrop-blur-sm">
          {([["month", "M"], ["week", "S"], ["day", "D"]] as [View, string][]).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-1.5 rounded-[10px] text-xs font-semibold transition-all ${view === v ? "bg-white dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 shadow-sm" : "text-slate-500 dark:text-neutral-500 hover:text-slate-700 dark:hover:text-neutral-300"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar body */}
      {view === "month" && renderMonthView()}
      {view === "week" && renderWeekView()}
      {view === "day" && renderDayView()}

      {/* Upcoming list */}
      {view === "month" && (() => {
        const upcoming = meetings.filter(m => m.status !== "CANCELLED" && m.status !== "COMPLETED").sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        if (!upcoming.length) return null;
        return (
          <div className="mt-6 card overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-neutral-200">Próximas reuniões</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
                <tr>
                  <th className="table-th">Título</th>
                  <th className="table-th">Início</th>
                  <th className="table-th">Participantes</th>
                  <th className="table-th">Status</th>
                  <th className="table-th" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
                {upcoming.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                    <td className="table-td font-medium text-slate-900 dark:text-neutral-100">
                      {m.title}
                      {m.location && <span className="text-slate-400 dark:text-neutral-500 font-normal ml-2 text-xs">📍 {m.location}</span>}
                    </td>
                    <td className="table-td text-slate-500 dark:text-neutral-400">
                      {m.isAllDay ? new Date(m.startAt).toLocaleDateString("pt-BR") : new Date(m.startAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="table-td text-slate-500 dark:text-neutral-400">{m.attendees.length || "—"}</td>
                    <td className="table-td"><span className={`pill ${STATUS_COLORS[m.status] ?? ""}`}>{STATUS_LABELS[m.status] ?? m.status}</span></td>
                    <td className="table-td text-right">
                      <a href={`/meet/${m.meetingLink}`} target="_blank" rel="noreferrer" className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Entrar</a>
                      <a href={`/api/meetings/${m.id}/ics`} download className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 mr-3">.ics</a>
                      <button onClick={() => openEdit(m)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Editar</button>
                      <button onClick={() => remove(m.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Reunião" : "Nova Reunião"}>
        {renderForm()}
      </Modal>
    </div>
  );
}
