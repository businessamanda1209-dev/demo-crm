"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/format";
import { parseBRL, formatBRLInput } from "@/lib/currency";

type Account = {
  id: string;
  name: string;
  type: string;
  bankName: string | null;
  agency: string | null;
  accountNumber: string | null;
  holderType: string;
  canReceive: boolean;
  canPay: boolean;
  balance: number;
  active: boolean;
};

const ACCOUNT_TYPES = [
  { value: "CHECKING", label: "Conta corrente", icon: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { value: "SAVINGS", label: "Conta poupança", icon: "M21 7l-3-3-3 3M12 21l-9-9 9-9 9 9z" },
  { value: "CASH_BOX", label: "Conta caixinha", icon: "M3 7h18M3 7v13h18V7M3 7l3-4h12l3 4" },
  { value: "CREDIT_CARD", label: "Cartão de crédito", icon: "M2 5h20v14H2zM2 10h20" },
  { value: "INVESTMENT", label: "Investimento", icon: "M3 17l6-6 4 4 8-8" },
  { value: "AUTO_RECEIPT", label: "Conta recebimento", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { value: "OTHER", label: "Outras contas", icon: "M12 5v14M5 12h14" },
];

const BANKS = ["Banco do Brasil", "Bradesco", "Itaú", "Santander", "Caixa Econômica Federal", "Nubank", "Inter", "Sicredi", "Sicoob", "BTG Pactual", "C6 Bank", "Outro"];

const EMPTY: Omit<Account, "id"> & { id?: string; balanceStr: string } = {
  name: "", type: "CHECKING", bankName: "", agency: "", accountNumber: "",
  holderType: "PESSOA_JURIDICA", canReceive: true, canPay: true, balance: 0, active: true,
  balanceStr: "",
};

export default function AccountsView({ initialAccounts }: { initialAccounts: Account[] }) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter((a) => a.name.toLowerCase().includes(q) || (a.bankName ?? "").toLowerCase().includes(q));
  }, [accounts, search]);

  function openNew() { setForm(EMPTY); setStep(1); setError(null); setOpen(true); }
  function openEdit(a: Account) {
    setForm({ ...a, balanceStr: formatBRLInput(a.balance), bankName: a.bankName ?? "", agency: a.agency ?? "", accountNumber: a.accountNumber ?? "" });
    setStep(2); setError(null); setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const isEdit = !!form.id;
    const balance = form.balanceStr ? parseBRL(form.balanceStr) : form.balance;
    const payload = {
      name: form.name,
      type: form.type,
      bankName: form.bankName,
      agency: form.agency,
      accountNumber: form.accountNumber,
      holderType: form.holderType,
      canReceive: form.canReceive,
      canPay: form.canPay,
      balance,
      active: form.active,
    };
    const url = isEdit ? `/api/erp/accounts/${form.id}` : "/api/erp/accounts";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar conta."); return; }
    if (isEdit) {
      setAccounts((prev) => prev.map((a) => (a.id === form.id ? { ...a, ...payload } as Account : a)));
    } else {
      const created = await res.json();
      setAccounts((prev) => [...prev, { ...created, balance: Number(created.balance) }]);
    }
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    await fetch(`/api/erp/accounts/${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  const typeLabel = (t: string) => ACCOUNT_TYPES.find((x) => x.value === t)?.label ?? t;
  const typeBadgeColor = (t: string) => {
    switch (t) {
      case "CHECKING": return "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30";
      case "SAVINGS": return "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30";
      case "CASH_BOX": return "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30";
      case "CREDIT_CARD": return "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30";
      case "INVESTMENT": return "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30";
      default: return "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-200 dark:ring-neutral-700";
    }
  };

  return (
    <div>
      <PageHeader
        title="Contas Bancárias"
        subtitle={`${accounts.length} conta${accounts.length !== 1 ? "s" : ""} cadastrada${accounts.length !== 1 ? "s" : ""}`}
        actions={<button onClick={openNew} className="btn-primary">+ Nova conta</button>}
      />

      <div className="mb-3">
        <input className="input h-9 py-0 text-xs w-full sm:w-72" placeholder="Buscar conta..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhuma conta encontrada.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Tipo</th>
                <th className="table-th">Nome da conta</th>
                <th className="table-th">Banco</th>
                <th className="table-th">Agência/Conta</th>
                <th className="table-th text-right">Saldo inicial</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td"><span className={`pill ${typeBadgeColor(a.type)}`}>{typeLabel(a.type)}</span></td>
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{a.name}</td>
                  <td className="table-td">{a.bankName || "—"}</td>
                  <td className="table-td text-xs">{a.agency ? `${a.agency} / ${a.accountNumber || "—"}` : "—"}</td>
                  <td className={`table-td text-right font-semibold tabular-nums ${a.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(a.balance)}
                  </td>
                  <td className="table-td text-right">
                    <button onClick={() => openEdit(a)} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 mr-3">Editar</button>
                    <button onClick={() => remove(a.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar conta" : "Nova conta"} size="lg">
        <form onSubmit={submit} className="space-y-4">
          {/* Stepper */}
          {!form.id && (
            <div className="flex items-center gap-2 mb-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex items-center gap-2">
                  <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= n ? "bg-brand-500 text-white" : "bg-slate-100 text-slate-400 dark:bg-neutral-800 dark:text-neutral-500"}`}>{n}</div>
                  {n < 3 && <div className={`h-px w-10 ${step > n ? "bg-brand-500" : "bg-slate-200 dark:bg-neutral-800"}`} />}
                </div>
              ))}
              <span className="ml-3 text-xs text-slate-500 dark:text-neutral-400">
                {step === 1 ? "Tipo de conta" : step === 2 ? "Dados da conta" : "Configurações"}
              </span>
            </div>
          )}

          {error && <p className="text-sm text-rose-500">{error}</p>}

          {/* Step 1 */}
          {(!form.id && step === 1) && (
            <div>
              <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Tipo de conta</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {ACCOUNT_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setForm({ ...form, type: t.value })}
                    className={`p-4 rounded-xl ring-1 text-left transition ${form.type === t.value ? "ring-brand-500 bg-brand-50 dark:bg-brand-500/10" : "ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800/60"}`}
                  >
                    <svg className="h-5 w-5 mb-2 text-brand-500" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24"><path d={t.icon} strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <div className="text-sm font-medium text-slate-800 dark:text-neutral-100">{t.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 */}
          {(form.id || step === 2) && (
            <div>
              <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Dados da conta</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="label">Nome da conta *</label>
                  <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="label">Banco</label>
                  <select className="input" value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })}>
                    <option value="">— Selecione —</option>
                    {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Tipo de pessoa</label>
                  <select className="input" value={form.holderType} onChange={(e) => setForm({ ...form, holderType: e.target.value })}>
                    <option value="PESSOA_FISICA">Pessoa Física</option>
                    <option value="PESSOA_JURIDICA">Pessoa Jurídica</option>
                  </select>
                </div>
                <div>
                  <label className="label">Agência (sem dígito)</label>
                  <input className="input" value={form.agency ?? ""} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
                </div>
                <div>
                  <label className="label">Conta (com dígito)</label>
                  <input className="input" value={form.accountNumber ?? ""} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label">Saldo inicial</label>
                  <input className="input" inputMode="decimal" placeholder="0,00" value={form.balanceStr} onChange={(e) => setForm({ ...form, balanceStr: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {(form.id || step === 3) && (
            <div>
              <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Configurações</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">Usar para receitas</div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">Permite vincular esta conta a receitas.</div>
                  </div>
                  <input type="checkbox" className="accent-brand-500 h-4 w-4" checked={form.canReceive} onChange={(e) => setForm({ ...form, canReceive: e.target.checked })} />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">Usar para despesas</div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">Permite vincular esta conta a despesas.</div>
                  </div>
                  <input type="checkbox" className="accent-brand-500 h-4 w-4" checked={form.canPay} onChange={(e) => setForm({ ...form, canPay: e.target.checked })} />
                </label>
                <label className="flex items-center justify-between p-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">Ativa</div>
                    <div className="text-xs text-slate-500 dark:text-neutral-400">Contas inativas não aparecem nos seletores.</div>
                  </div>
                  <input type="checkbox" className="accent-brand-500 h-4 w-4" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                </label>
              </div>
            </div>
          )}

          <div className="flex justify-between gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            {!form.id && step < 3 ? (
              <div className="flex gap-2">
                {step > 1 && <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>Voltar</button>}
                <button type="button" className="btn-primary" onClick={() => setStep((s) => s + 1)}>Avançar</button>
              </div>
            ) : (
              <div className="flex gap-2">
                {!form.id && step > 1 && <button type="button" className="btn-secondary" onClick={() => setStep((s) => s - 1)}>Voltar</button>}
                <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : form.id ? "Salvar alterações" : "Criar conta"}</button>
              </div>
            )}
          </div>
        </form>
      </Modal>
    </div>
  );
}
