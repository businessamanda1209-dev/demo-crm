"use client";

import Link from "next/link";
import StatCard from "@/components/StatCard";
import { formatCurrency, formatDate, formatNumber, stageColor, statusColor } from "@/lib/format";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

type RecentContact = {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  status: "LEAD" | "QUALIFIED" | "CUSTOMER" | "CHURNED";
  company: { name: string } | null;
};

type RecentDeal = {
  id: string;
  title: string;
  value: number | string;
  stage: string;
  expectedCloseDate: string | Date | null;
  closedAt: string | Date | null;
  company: { name: string } | null;
};

type Props = {
  userName: string;
  companyCount: number;
  contactCount: number;
  customerCount: number;
  pipelineValue: number;
  openDealCount: number;
  recentContacts: RecentContact[];
  recentDeals: RecentDeal[];
};

const IconBuilding = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
  </svg>
);

const IconPerson = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

const IconDollar = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v12M9 9.5C9 8.1 10.3 7 12 7s3 1.1 3 2.5S13.7 12 12 12s-3 1.1-3 2.5S10.3 17 12 17s3-1.1 3-2.5" />
  </svg>
);

const IconTrend = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M22 7l-8.5 8.5-5-5L2 17" />
    <path d="M16 7h6v6" />
  </svg>
);

export default function DashboardView({
  userName,
  companyCount,
  contactCount,
  customerCount,
  pipelineValue,
  openDealCount,
  recentContacts,
  recentDeals,
}: Props) {
  const { lang } = useLanguage();
  const tx = t(lang);
  const d = tx.dashboard;

  return (
    <div>
      {/* Page header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-700 dark:text-slate-100 tracking-tight">
          {d.title(userName)}
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
          {d.subtitle}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={d.statCompanies}
          value={formatNumber(companyCount)}
          hint={d.statCompaniesHint}
          icon={<IconBuilding />}
        />
        <StatCard
          label={d.statContacts}
          value={formatNumber(contactCount)}
          hint={d.statContactsHint(customerCount)}
          icon={<IconPerson />}
        />
        <StatCard
          label={d.statPipeline}
          value={formatCurrency(pipelineValue)}
          hint={d.statPipelineHint(openDealCount)}
          icon={<IconDollar />}
        />
        <StatCard
          label={d.statAvgDeal}
          value={formatCurrency(openDealCount ? pipelineValue / openDealCount : 0)}
          hint={d.statAvgDealHint}
          icon={<IconTrend />}
        />
      </div>

      {/* Recent panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
        {/* Recent Contacts */}
        <div className="rounded-2xl border border-brand-100/80 dark:border-slate-700 bg-gradient-to-br from-brand-50/50 via-white to-white dark:from-slate-800/60 dark:via-slate-800 dark:to-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100/60 dark:border-slate-700/60">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {d.recentContacts}
            </h2>
            <Link
              href="/contacts"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              {d.viewAll}
            </Link>
          </div>

          {recentContacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-brand-400 dark:text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="10" cy="8" r="4" />
                  <path d="M2 20a8 8 0 0 1 13.4-5.9" />
                  <path d="M19 15v6M16 18h6" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{d.noContacts}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-[220px]">{d.noContactsDesc}</p>
            </div>
          ) : (
            <ul className="divide-y divide-brand-50/80 dark:divide-slate-700/50">
              {recentContacts.map((c) => (
                <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {c.firstName} {c.lastName}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {c.title ?? "—"}
                      {c.company ? ` · ${c.company.name}` : ""}
                    </div>
                  </div>
                  <span className={`pill ${statusColor(c.status)} whitespace-nowrap`}>
                    {c.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent Deals */}
        <div className="rounded-2xl border border-brand-100/80 dark:border-slate-700 bg-gradient-to-br from-brand-50/50 via-white to-white dark:from-slate-800/60 dark:via-slate-800 dark:to-slate-800 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-brand-100/60 dark:border-slate-700/60">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {d.recentDeals}
            </h2>
            <Link
              href="/analytics"
              className="text-xs font-semibold text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
            >
              {d.viewAnalytics}
            </Link>
          </div>

          {recentDeals.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-brand-400 dark:text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="15" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                  <path d="M12 13v4M10 15h4" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{d.noDeals}</p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-[220px]">{d.noDealsDesc}</p>
            </div>
          ) : (
            <ul className="divide-y divide-brand-50/80 dark:divide-slate-700/50">
              {recentDeals.map((deal) => (
                <li key={deal.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {deal.title}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500 truncate">
                      {deal.company?.name ?? "—"} ·{" "}
                      {deal.expectedCloseDate
                        ? `${d.closes} ${formatDate(deal.expectedCloseDate)}`
                        : deal.closedAt
                          ? `${d.closed} ${formatDate(deal.closedAt)}`
                          : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 whitespace-nowrap">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                      {formatCurrency(Number(deal.value))}
                    </span>
                    <span className={`pill ${stageColor(deal.stage)}`}>
                      {deal.stage.replace("_", " ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
