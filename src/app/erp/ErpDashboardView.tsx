"use client";

import Link from "next/link";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/format";

type Account = { id: string; name: string; type: string; balance: number };
type CashFlowMonth = { label: string; entradas: number; saidas: number };
type PayRecvMonth = { label: string; receber: number; pagar: number };

type Props = {
  receitaLiquida: number;
  lucroOperacional: number;
  inadimplencia: number;
  custosFixos: number;
  aReceber: number;
  aPagar: number;
  cashFlow: CashFlowMonth[];
  payVsRecv: PayRecvMonth[];
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
  label, value, color, href, subtitle,
}: {
  label: string;
  value: number;
  color: "green" | "red" | "amber" | "slate" | "blue";
  href?: string;
  subtitle?: string;
}) {
  const palette = {
    green: "text-emerald-600 dark:text-emerald-400",
    red: "text-rose-600 dark:text-rose-400",
    amber: "text-amber-600 dark:text-amber-400",
    slate: "text-slate-600 dark:text-neutral-300",
    blue: "text-sky-600 dark:text-sky-400",
  }[color];

  const inner = (
    <div className="card p-5 flex flex-col gap-1 hover:ring-brand-300 dark:hover:ring-brand-500/30 transition-all h-full">
      <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500">
        {label}
      </span>
      <span className={`text-2xl font-bold tabular-nums ${palette}`}>
        {formatCurrency(value)}
      </span>
      {subtitle && (
        <span className="text-[11px] text-slate-400 dark:text-neutral-500">{subtitle}</span>
      )}
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default function ErpDashboardView({
  receitaLiquida,
  lucroOperacional,
  inadimplencia,
  custosFixos,
  aReceber,
  aPagar,
  cashFlow,
  payVsRecv,
  accounts,
}: Props) {
  const monthLabel = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  const cashFlowEmpty = cashFlow.every((d) => d.entradas === 0 && d.saidas === 0);
  const payRecvEmpty = payVsRecv.every((d) => d.receber === 0 && d.pagar === 0);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-700 dark:text-neutral-100 tracking-tight">
          Liba Finance
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-neutral-500 capitalize">
          {monthLabel} — visão consolidada da operação.
        </p>
      </div>

      {/* Primary row — 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <SummaryCard label="Receita Líquida" value={receitaLiquida} color="green" subtitle="Recebido no mês" />
        <SummaryCard
          label="Lucro Operacional"
          value={lucroOperacional}
          color={lucroOperacional >= 0 ? "green" : "red"}
          subtitle="Receita − Despesas pagas"
        />
        <SummaryCard label="Inadimplência" value={inadimplencia} color="amber" subtitle="Receitas vencidas" href="/erp/receivables?status=OVERDUE" />
        <SummaryCard label="Custos Fixos" value={custosFixos} color="slate" subtitle="Recorrentes do mês" />
      </div>

      {/* Secondary row — 2 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <SummaryCard label="A Receber" value={aReceber} color="blue" href="/erp/receivables" subtitle="Pendentes totais" />
        <SummaryCard label="A Pagar" value={aPagar} color="red" href="/erp/payables" subtitle="Pendentes totais" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Cash flow */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-neutral-200 mb-1">
            Fluxo de Caixa
          </h2>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mb-3">Últimos 6 meses</p>
          {cashFlowEmpty ? (
            <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-neutral-500">
              Sem movimentações registradas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={cashFlow as any}>
                <defs>
                  <linearGradient id="g-entradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="g-saidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f87171" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e5e5e5" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="entradas" name="Entradas" stroke="#22c55e" fill="url(#g-entradas)" strokeWidth={2} />
                <Area type="monotone" dataKey="saidas" name="Saídas" stroke="#f87171" fill="url(#g-saidas)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Pay vs Recv */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-neutral-200 mb-1">
            Contas a Pagar vs Receber
          </h2>
          <p className="text-xs text-slate-400 dark:text-neutral-500 mb-3">Últimos 6 meses (vencimento)</p>
          {payRecvEmpty ? (
            <div className="flex items-center justify-center h-56 text-sm text-slate-400 dark:text-neutral-500">
              Sem lançamentos registrados.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={payVsRecv as any} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.15)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v)}
                  contentStyle={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "#e5e5e5" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="receber" name="A Receber" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pagar" name="A Pagar" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Accounts */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-neutral-800">
          <h2 className="text-sm font-semibold text-slate-700 dark:text-neutral-200">Contas Bancárias</h2>
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
  );
}
