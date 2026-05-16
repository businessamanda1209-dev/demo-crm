"use client";

import Link from "next/link";
import PageHeader from "@/components/PageHeader";
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
  companyCount: number;
  contactCount: number;
  customerCount: number;
  pipelineValue: number;
  openDealCount: number;
  recentContacts: RecentContact[];
  recentDeals: RecentDeal[];
};

export default function DashboardView({
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
      <PageHeader title={d.title} subtitle={d.subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={d.statCompanies}
          value={formatNumber(companyCount)}
          hint={d.statCompaniesHint}
        />
        <StatCard
          label={d.statContacts}
          value={formatNumber(contactCount)}
          hint={d.statContactsHint(customerCount)}
        />
        <StatCard
          label={d.statPipeline}
          value={formatCurrency(pipelineValue)}
          hint={d.statPipelineHint(openDealCount)}
        />
        <StatCard
          label={d.statAvgDeal}
          value={formatCurrency(openDealCount ? pipelineValue / openDealCount : 0)}
          hint={d.statAvgDealHint}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {d.recentContacts}
            </h2>
            <Link href="/contacts" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {d.viewAll}
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentContacts.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {c.firstName} {c.lastName}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {c.title ?? "—"}
                    {c.company ? ` · ${c.company.name}` : ""}
                  </div>
                </div>
                <span className={`pill ${statusColor(c.status)} whitespace-nowrap`}>
                  {c.status}
                </span>
              </li>
            ))}
            {recentContacts.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                {d.noContacts}
              </li>
            )}
          </ul>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {d.recentDeals}
            </h2>
            <Link href="/analytics" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              {d.viewAnalytics}
            </Link>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentDeals.map((deal) => (
              <li key={deal.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {deal.title}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {deal.company?.name ?? "—"} ·{" "}
                    {deal.expectedCloseDate
                      ? `${d.closes} ${formatDate(deal.expectedCloseDate)}`
                      : deal.closedAt
                        ? `${d.closed} ${formatDate(deal.closedAt)}`
                        : "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3 whitespace-nowrap">
                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 tabular-nums">
                    {formatCurrency(Number(deal.value))}
                  </span>
                  <span className={`pill ${stageColor(deal.stage)}`}>
                    {deal.stage.replace("_", " ")}
                  </span>
                </div>
              </li>
            ))}
            {recentDeals.length === 0 && (
              <li className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                {d.noDeals}
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
