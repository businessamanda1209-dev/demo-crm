"use client";

import { Fragment, useEffect, useState } from "react";
import PageHeader from "@/components/PageHeader";

type Account = { id: string; name: string };

type Suggestion = {
  id: string;
  kind: "payable" | "receivable";
  description: string;
  amount: number;
  dueDate: string;
  party: string | null;
};

type Txn = {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: "CREDIT" | "DEBIT";
  reconciled: boolean;
  payableId: string | null;
  receivableId: string | null;
  suggestions: Suggestion[];
};

function fmtBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR");
}

export default function ReconciliationView({ accounts }: { accounts: Account[] }) {
  const [accountId, setAccountId] = useState<string>("");
  const [filename, setFilename] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [txns, setTxns] = useState<Txn[]>([]);

  async function reload() {
    setLoading(true);
    const q = accountId ? `?accountId=${accountId}` : "";
    const res = await fetch(`/api/erp/reconciliation/transactions${q}`);
    if (res.ok) setTxns(await res.json());
    setLoading(false);
  }

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [accountId]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    setInfo(null);
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setFilename(f.name);
    setContent(text);
  }

  async function doImport() {
    setError(null); setInfo(null);
    if (!content) { setError("Selecione um arquivo de extrato (.csv ou .ofx)."); return; }
    setImporting(true);
    const res = await fetch("/api/erp/reconciliation/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filename, content, accountId: accountId || null }),
    });
    setImporting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Falha ao importar.");
      return;
    }
    const data = await res.json();
    setInfo(`Importadas ${data.created} transações (${data.skipped} duplicadas ignoradas).`);
    setFilename(""); setContent("");
    reload();
  }

  async function reconcile(t: Txn, s: Suggestion) {
    const res = await fetch(`/api/erp/reconciliation/transactions/${t.id}/reconcile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: s.kind, targetId: s.id }),
    });
    if (res.ok) {
      setTxns((prev) =>
        prev.map((x) =>
          x.id === t.id
            ? { ...x, reconciled: true, payableId: s.kind === "payable" ? s.id : null, receivableId: s.kind === "receivable" ? s.id : null, suggestions: [] }
            : x,
        ),
      );
    }
  }

  async function unmatch(t: Txn) {
    const res = await fetch(`/api/erp/reconciliation/transactions/${t.id}/unmatch`, { method: "POST" });
    if (res.ok) {
      // re-fetch to get fresh suggestions
      reload();
    }
  }

  return (
    <div>
      <PageHeader
        title="Conciliação Bancária"
        subtitle="Importe seu extrato bancário (CSV ou OFX) e concilie automaticamente com seus lançamentos."
      />

      <div className="card p-5 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="label">Conta financeira</label>
            <select className="input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Todas</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Arquivo do extrato (.csv ou .ofx)</label>
            <input
              type="file"
              accept=".csv,.ofx,.xlsx,text/csv"
              onChange={onFile}
              className="block w-full text-sm text-slate-600 dark:text-neutral-300 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-brand-500 file:text-white file:font-semibold hover:file:bg-brand-600"
            />
            {filename && <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">{filename}</p>}
          </div>
        </div>
        {error && <p className="text-xs text-rose-500 mb-2">{error}</p>}
        {info && <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">{info}</p>}
        <button onClick={doImport} disabled={importing || !content} className="btn-primary text-sm">
          {importing ? "Importando..." : "Importar extrato"}
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">Carregando...</p>
        ) : txns.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-neutral-500">
            Nenhuma transação importada ainda.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Data</th>
                <th className="table-th">Descrição</th>
                <th className="table-th">Tipo</th>
                <th className="table-th text-right">Valor</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {txns.map((t) => (
                <Fragment key={t.id}>
                  <tr className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                    <td className="table-td">{fmtDate(t.date)}</td>
                    <td className="table-td">{t.description}</td>
                    <td className="table-td text-xs">{t.type === "DEBIT" ? "Saída" : "Entrada"}</td>
                    <td className={`table-td text-right font-semibold tabular-nums ${t.type === "DEBIT" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                      {fmtBRL(t.amount)}
                    </td>
                    <td className="table-td">
                      {t.reconciled ? (
                        <span className="pill bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30">Conciliada</span>
                      ) : (
                        <span className="pill bg-slate-100 text-slate-600 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-200 dark:ring-neutral-700">Pendente</span>
                      )}
                    </td>
                    <td className="table-td text-right">
                      {t.reconciled && (
                        <button onClick={() => unmatch(t)} className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700">
                          Desconciliar
                        </button>
                      )}
                    </td>
                  </tr>
                  {!t.reconciled && t.suggestions.length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-3 bg-slate-50/50 dark:bg-neutral-900/40">
                        <p className="text-[11px] uppercase tracking-wide font-semibold text-slate-400 dark:text-neutral-500 mb-2">
                          Sugestões de match
                        </p>
                        <div className="space-y-1.5">
                          {t.suggestions.map((s) => (
                            <div key={`${s.kind}-${s.id}`} className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-800 dark:text-neutral-100 truncate">
                                  {s.description}
                                </p>
                                <p className="text-[11px] text-slate-500 dark:text-neutral-400">
                                  {s.party || "—"} · venc. {fmtDate(s.dueDate)} · {fmtBRL(s.amount)}
                                </p>
                              </div>
                              <button
                                onClick={() => reconcile(t, s)}
                                className="btn-primary text-xs px-3 py-1.5 shrink-0"
                              >
                                Conciliar
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
