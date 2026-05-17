"use client";

import { PERIOD_LABELS, PeriodKind, PeriodState, periodLabel, shiftPeriod } from "@/lib/period";

type Props = {
  value: PeriodState;
  onChange: (p: PeriodState) => void;
};

export default function PeriodFilter({ value, onChange }: Props) {
  const supportsNav = value.kind === "month" || value.kind === "year";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className="input h-9 py-0 text-xs w-auto min-w-[160px]"
        value={value.kind}
        onChange={(e) => onChange({ ...value, kind: e.target.value as PeriodKind })}
      >
        {(Object.keys(PERIOD_LABELS) as PeriodKind[]).map((k) => (
          <option key={k} value={k}>{PERIOD_LABELS[k]}</option>
        ))}
      </select>

      {supportsNav && (
        <div className="flex items-center gap-1">
          <button type="button" className="h-9 w-9 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center justify-center" onClick={() => onChange(shiftPeriod(value, -1))} aria-label="Anterior">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <div className="h-9 px-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 flex items-center text-xs font-medium min-w-[140px] justify-center bg-white dark:bg-neutral-900">
            {periodLabel(value)}
          </div>
          <button type="button" className="h-9 w-9 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 flex items-center justify-center" onClick={() => onChange(shiftPeriod(value, 1))} aria-label="Próximo">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      )}

      {value.kind === "custom" && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-neutral-400">De</span>
          <input type="date" className="input h-9 py-0 text-xs w-auto" value={value.customStart ?? ""} onChange={(e) => onChange({ ...value, customStart: e.target.value })} />
          <span className="text-xs text-slate-500 dark:text-neutral-400">Até</span>
          <input type="date" className="input h-9 py-0 text-xs w-auto" value={value.customEnd ?? ""} onChange={(e) => onChange({ ...value, customEnd: e.target.value })} />
        </div>
      )}
    </div>
  );
}
