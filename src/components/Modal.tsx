"use client";

import { ReactNode, useEffect } from "react";

const SIZES: Record<string, string> = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-4xl",
};

export default function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: keyof typeof SIZES;
  footer?: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div
        className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className={`relative w-full ${SIZES[size]} bg-white dark:bg-neutral-900 rounded-xl shadow-xl ring-1 ring-slate-200 dark:ring-neutral-800 my-4`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h3 className="text-base font-semibold text-slate-900 dark:text-neutral-100">
            {title}
          </h3>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            onClick={onClose}
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-slate-100 dark:border-neutral-800 flex justify-end gap-3 bg-slate-50/50 dark:bg-neutral-900/50 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
