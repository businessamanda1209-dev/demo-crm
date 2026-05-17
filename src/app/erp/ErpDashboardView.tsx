"use client";

import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";

type CashFlowDay = { label: string; income: number; expense: number };
type Account = { id: string; name: string; type: string; balance: number };

type Props = {
  totalReceivable: number;
  totalPayable: number;
  overdueReceivable: number;
  overduePayable: number;
  todayReceivable: number;
  todayPayable: number;
  cashFlow: CashFlowDay[];
  accounts: Account[];
};

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  CHECKING: "Conta Corrente",
  CASH_BOX: "Caixa",
  CREDIT_CARD: "Cartão de Crédito",
  INVESTMENT: "Investimento",
  SAVINGS: "Poupança",
  AUTO_RECEIPT: "Recebimento Automático",
  OTHER: "Outro",
};

function SummaryCard({
  label,
  value,
  color,
  href,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "amber" | "slate";
  href: string;
}) {
  const palette = {
    green: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10",
    red: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10",
    amber: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10",
    slate: "text-slate-600 dark:text-neutral-400 bg-slate-50 dark:bg-neutral-800",
  }[color];

  return (
    <Link
      href={href}
      className="card p-5 flex flex-col gap-1 hover:ring-brand-300 dark:hover:ring-brand-500/30 transition-all"
    >
      <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500">
        {label}
      </span>
      <span className={`text-xl font-bold tabular-nums rounded-lg px-2 py-0.5 w-fit ${palette}`}>
        {formatCurrency(value)}
      </span>
    </Link>
  );
}

export default function ErpDashboardView({
  totalReceivable,
  totalPayable,
  overdueReceivable,
  overduePayable,
  todayReceivable,
  todayPayable,
  cashFlow,
  accounts,
}: Props) {
  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-700 dark:text-neutral-100 tracking-tight">
          Painel Financeiro
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-neutral-500">
          Visão geral das suas finanças — recebimentos, pagamentos e saldo.
        </p>
      </div>

      {/* Summary cards — 3 columns x 2 rows */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <SummaryCard label="A receber" value={totalReceivable} color="green" href="/erp/receivables" />
        <SummaryCard label="A pagar" value={totalPayable} color="red" href="/erp/payables" />
        <SummaryCard label="Vencidos a receber" value={overdueReceivable} color="amber" href="/erp/receivables?status=OVERDUE" />
        <SummaryCard label="Vencidos a pagar" value={overduePayable} color="amber" href="/erp/payables?status=OVERDUE" />
        <SummaryCard label="Vence hoje (receber)" value={todayReceivable} color="slate" href="/erp/receivables?due=today" />
        <SummaryCard label="Vence hoje (pagar)" value={todayPayable} color="slate" href="/erp/payables?due=today" />
      </div>

      {/* Charts + Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Cash flow chart */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-neutral-200 mb-4">
            Fluxo de Caixa — últimos 7 dias
          </h2>
          {cashFlow.every((d) => d.income === 0 && d.expense === 0) ? (
            <div className="flex items-center justify-center h-48 text-sm text-slate-400 dark:text-neutral-500">
              Nenhum lançamento nos últimos 7 dias.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={cashFlow} barSize={14}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e5e5e5" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Receitas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Accounts balances */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-slate-700 dark:text-neutral-200">Contas</h2>
            <Link href="/erp/accounts" className="text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors">
              Gerenciar →
            </Link>
          </div>
          {accounts.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400 dark:text-neutral-500">
              Nenhuma conta cadastrada.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
              {accounts.map((a) => (
                <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-neutral-100 truncate">{a.name}</p>
                    <p className="text-xs text-slate-400 dark:text-neutral-500">{ACCOUNT_TYPE_LABEL[a.type] ?? a.type}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${a.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(a.balance)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
