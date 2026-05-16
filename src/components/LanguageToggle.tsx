"use client";

import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const tx = t(lang);

  function toggle() {
    setLang(lang === "en" ? "pt-BR" : "en");
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={tx.lang.switchToLabel}
      className="inline-flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      {tx.lang.switchTo}
    </button>
  );
}
