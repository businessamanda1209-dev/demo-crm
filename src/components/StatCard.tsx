import { ReactNode } from "react";

export default function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-brand-100 dark:border-neutral-800 bg-gradient-to-br from-brand-50 via-white to-white dark:from-neutral-900 dark:via-neutral-900 dark:to-neutral-900 shadow-sm p-5 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500">
          {label}
        </div>
        {icon && (
          <div className="w-8 h-8 shrink-0 rounded-lg bg-brand-100/80 dark:bg-brand-500/10 flex items-center justify-center text-brand-500 dark:text-brand-400">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-3 text-[28px] leading-none font-bold text-slate-800 dark:text-neutral-100 tabular-nums">
        {value}
      </div>
      {hint && (
        <div className="mt-1.5 text-xs text-slate-400 dark:text-neutral-500">{hint}</div>
      )}
      <svg
        className="mt-4 w-full text-brand-400 dark:text-brand-500"
        height="28"
        viewBox="0 0 160 28"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polyline
          points="0,22 18,18 36,20 54,14 72,17 90,10 108,13 126,7 144,9 160,6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
