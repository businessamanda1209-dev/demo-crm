"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import SignOutButton from "./SignOutButton";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

export default function Sidebar() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const tx = t(lang);

  const links = [
    {
      href: "/",
      label: tx.nav.dashboard,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
    },
    {
      href: "/contacts",
      label: tx.nav.contacts,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0" />
        </svg>
      ),
    },
    {
      href: "/companies",
      label: tx.nav.companies,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
        </svg>
      ),
    },
    {
      href: "/analytics",
      label: tx.nav.analytics,
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M3 3v18h18" />
          <path d="M7 14l4-4 4 4 5-5" />
        </svg>
      ),
    },
    {
      href: "/calendar",
      label: "Agenda",
      icon: (
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-100 dark:border-neutral-900 bg-white dark:bg-neutral-950">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-100 dark:border-neutral-900">
        <Link href="/" className="flex flex-col gap-0.5">
          <div className="text-2xl font-black tracking-tight leading-none">
            <span className="text-slate-900 dark:text-white">LIBA</span>
            <span className="text-brand-500">+</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
            CRM by Liba+
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((link) => {
          const active =
            link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active
                  ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
              }`}
            >
              <span className={active ? "text-brand-500 dark:text-brand-400" : ""}>
                {link.icon}
              </span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-neutral-900 space-y-0.5">
        <ThemeToggle />
        <LanguageToggle />
        <SignOutButton />
      </div>

      {/* ERP entry point */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-neutral-900">
        <Link
          href="/erp"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-brand-600 dark:text-brand-400 bg-brand-50/80 dark:bg-brand-500/10 hover:bg-brand-100/60 dark:hover:bg-brand-500/20 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
            <path d="M7 8h.01M7 12h.01M12 8h5M12 12h5" />
          </svg>
          Liba Finance
        </Link>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-100 dark:border-neutral-900">
        <p className="text-[11px] text-slate-400 dark:text-neutral-500">
          AI powered by{" "}
          <span className="font-semibold text-slate-600 dark:text-neutral-300">Liba</span>
          <span className="font-semibold text-brand-500">+</span>
        </p>
      </div>
    </aside>
  );
}
