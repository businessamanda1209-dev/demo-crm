"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import SignOutButton from "./SignOutButton";

const links = [
  {
    href: "/erp",
    label: "Painel",
    exact: true,
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
    href: "/erp/receivables",
    label: "Contas a Receber",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    href: "/erp/payables",
    label: "Contas a Pagar",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    href: "/erp/accounts",
    label: "Contas Bancárias",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/erp/categories",
    label: "Categorias",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M4 6h16M4 12h10M4 18h7" />
      </svg>
    ),
  },
  {
    href: "/erp/cost-centers",
    label: "Centros de Custo",
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
];

export default function ErpSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-slate-100 dark:border-neutral-900 bg-white dark:bg-neutral-950">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-slate-100 dark:border-neutral-900">
        <Link href="/erp" className="flex flex-col gap-0.5">
          <div className="text-2xl font-black tracking-tight leading-none">
            <span className="text-slate-900 dark:text-white">LIBA</span>
            <span className="text-brand-500">+</span>
          </div>
          <div className="text-[11px] text-slate-400 dark:text-neutral-500 font-medium">
            Liba Finance · ERP
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {links.map((link) => {
          const active = link.exact
            ? pathname === link.href
            : pathname.startsWith(link.href);
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

      {/* Back to CRM */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-neutral-900">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 transition-all"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Voltar ao CRM
        </Link>
      </div>

      {/* Bottom controls */}
      <div className="px-3 py-3 border-t border-slate-100 dark:border-neutral-900 space-y-0.5">
        <ThemeToggle />
        <LanguageToggle />
        <SignOutButton />
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
