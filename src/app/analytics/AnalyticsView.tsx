"use client";

import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import AnalyticsCharts from "./AnalyticsCharts";
import { formatCurrency, formatNumber } from "@/lib/format";
import { useLanguage } from "@/context/LanguageContext";
import { t } from "@/lib/i18n";

type TopCompany = {
  name: string;
  industry: string;
  contacts: number;
  deals: number;
  revenue: number;
};

type Props = {
  statusData: { name: string; value: number }[];
  stageData: { stage: string; count: number; value: number }[];
  industryData: { industry: string; revenue: number }[];
  monthlyContacts: { month: string; contacts: number }[];
  topCompanies: TopCompany[];
  totalPipeline: number;
  wonValue: number;
  closedDealsLength: number;
  dealsLength: number;
  winRate: number;
  avgDealSize: number;
};

export default function AnalyticsView({
  statusData,
  stageData,
  industryData,
  monthlyContacts,
  topCompanies,
  totalPipeline,
  wonValue,
  closedDealsLength,
  dealsLength,
  winRate,
  avgDealSize,
}: Props) {
  const { lang } = useLanguage();
  const tx = t(lang);
  const a = tx.analytics;

  return (
    <div>
      <PageHeader title={a.title} subtitle={a.subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label={a.statPipeline}
          value={formatCurrency(totalPipeline)}
          hint={a.statPipelineHint(dealsLength)}
        />
        <StatCard
          label={a.statWon}
          value={formatCurrency(wonValue)}
          hint={a.statWonHint}
        />
        <StatCard
          label={a.statWinRate}
          value={`${(winRate * 100).toFixed(1)}%`}
          hint={a.statWinRateHint(closedDealsLength)}
        />
        <StatCard
          label={a.statAvgDeal}
          value={formatCurrency(avgDealSize)}
          hint={a.statAvgDealHint}
        />
      </div>

      <AnalyticsCharts
        statusData={statusData}
        stageData={stageData}
        industryData={industryData}
        monthlyContacts={monthlyContacts}
      />

      <div className="card mt-6 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">
            {a.topAccounts}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">{a.colCompany}</th>
                <th className="table-th">{a.colIndustry}</th>
                <th className="table-th">{a.colContacts}</th>
                <th className="table-th">{a.colDeals}</th>
                <th className="table-th">{a.colRevenue}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {topCompanies.map((c) => (
                <tr key={c.name}>
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">
                    {c.name}
                  </td>
                  <td className="table-td">{c.industry}</td>
                  <td className="table-td tabular-nums">
                    {formatNumber(c.contacts)}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatNumber(c.deals)}
                  </td>
                  <td className="table-td tabular-nums">
                    {formatCurrency(c.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
