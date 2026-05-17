"use client";

import { useState } from "react";
import PageHeader from "@/components/PageHeader";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function AccountingClosingView() {
  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const href = `/api/erp/export/accounting-closing?year=${year}&month=${month}`;

  return (
    <div>
      <PageHeader
        title="Fechamento Contábil"
        subtitle="Pacote de apoio contábil — Não substitui obrigações oficiais como SPED/ECD/ECF"
      />

      <div className="card p-6 max-w-2xl">
        <p className="text-sm text-slate-600 dark:text-neutral-300 mb-5">
          Gere um pacote consolidado com todos os dados financeiros do período: contas a pagar,
          contas a receber, clientes, fornecedores, categorias, centros de custo, contas e
          transações bancárias.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <div>
            <label className="label">Ano</label>
            <select className="input" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Mês</label>
            <select className="input" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <a href={href} className="btn-primary inline-block">Gerar pacote XLSX</a>

        <p className="mt-4 text-[11px] text-slate-400 dark:text-neutral-500">
          O arquivo é gerado em formato CSV (.csv), totalmente compatível com Excel e Google
          Planilhas (codificação UTF-8 com BOM, separador <code>;</code>).
        </p>
      </div>
    </div>
  );
}
