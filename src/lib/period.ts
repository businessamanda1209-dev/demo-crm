// Period filtering utilities (Brazilian locale, client-side)

export type PeriodKind =
  | "today"
  | "week"
  | "month"
  | "year"
  | "last30"
  | "last12m"
  | "all"
  | "custom";

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  today: "Hoje",
  week: "Esta semana",
  month: "Este mês",
  year: "Este ano",
  last30: "Últimos 30 dias",
  last12m: "Últimos 12 meses",
  all: "Todo o período",
  custom: "Personalizado",
};

export type PeriodState = {
  kind: PeriodKind;
  anchor: string; // ISO date — represents the reference point (month/year navigation)
  customStart?: string;
  customEnd?: string;
};

export function defaultPeriod(): PeriodState {
  return { kind: "month", anchor: new Date().toISOString() };
}

function startOfDay(d: Date) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
function endOfDay(d: Date) { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; }

export function periodRange(p: PeriodState): { start: Date; end: Date } | null {
  const anchor = new Date(p.anchor);
  const today = startOfDay(new Date());
  switch (p.kind) {
    case "today":
      return { start: startOfDay(today), end: endOfDay(today) };
    case "week": {
      const day = today.getDay(); // 0 sun
      const start = new Date(today); start.setDate(today.getDate() - day);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "month": {
      const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "year": {
      const start = new Date(anchor.getFullYear(), 0, 1);
      const end = new Date(anchor.getFullYear(), 11, 31);
      return { start: startOfDay(start), end: endOfDay(end) };
    }
    case "last30": {
      const start = new Date(today); start.setDate(today.getDate() - 29);
      return { start: startOfDay(start), end: endOfDay(today) };
    }
    case "last12m": {
      const start = new Date(today); start.setMonth(today.getMonth() - 11);
      start.setDate(1);
      return { start: startOfDay(start), end: endOfDay(today) };
    }
    case "custom": {
      if (!p.customStart || !p.customEnd) return null;
      return { start: startOfDay(new Date(p.customStart)), end: endOfDay(new Date(p.customEnd)) };
    }
    case "all":
    default:
      return null;
  }
}

export function inPeriod(date: string | Date, p: PeriodState): boolean {
  const range = periodRange(p);
  if (!range) return true;
  const d = typeof date === "string" ? new Date(date) : date;
  return d >= range.start && d <= range.end;
}

const MONTHS_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function periodLabel(p: PeriodState): string {
  const a = new Date(p.anchor);
  switch (p.kind) {
    case "month": return `${MONTHS_PT[a.getMonth()]} ${a.getFullYear()}`;
    case "year": return `${a.getFullYear()}`;
    default: return PERIOD_LABELS[p.kind];
  }
}

export function shiftPeriod(p: PeriodState, dir: -1 | 1): PeriodState {
  const a = new Date(p.anchor);
  if (p.kind === "month") {
    a.setMonth(a.getMonth() + dir);
  } else if (p.kind === "year") {
    a.setFullYear(a.getFullYear() + dir);
  }
  return { ...p, anchor: a.toISOString() };
}
