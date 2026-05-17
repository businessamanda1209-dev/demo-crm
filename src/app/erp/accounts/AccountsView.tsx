"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/format";

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
  { value: "CHECKING", label: "Conta Corrente" },
  { value: "CASH_BOX", label: "Caixa" },
  { value: "CREDIT_CARD", label: "Cartão de Crédito" },
  { value: "INVESTMENT", label: "Investimento" },
  { value: "SAVINGS", label: "Poupança" },
  { value: "AUTO_RECEIPT", label: "Recebimento Automático" },
  { value: "OTHER", label: "Outro" },
];

const BANKS = [
  "Banco do Brasil", "Bradesco", "Itaú", "Santander", "Caixa Econômica Federal",
  "Nubank", "Inter", "Sicredi", "Sicoob", "BTG Pactual", "C6 Bank", "Outro",
];

const EMPTY: Omit<Account, "id"> = {
  name: "", type: "CHECKING", bankName: "", agency: "", accountNumber: "",
  holderType: "PESSOA_JURIDICA", canReceive: true, canPay: true, balance: 0, active: true,
};

export default function AccountsView({ initialAccounts }: { initialAccounts: Account[] }) {
  const router = useRouter();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Omit<Account, "id"> & { id?: string }>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(a: Account) { setForm(a); setError(null); setOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const isEdit = !!form.id;
    const url = isEdit ? `/api/erp/accounts/${form.id}` : "/api/erp/accounts";
    const method = isEdit ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar conta."); return; }
    setOpen(false);
    router.refresh();
    if (isEdit) {
      setAccounts((prev) => prev.map((a) => (a.id === form.id ? { ...a, ...form, id: a.id } as Account : a)));
    } else {
      const created = await res.json();
      setAccounts((prev) => [...prev, { ...created, balance: Number(created.balance) }]);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta conta?")) return;
    await fetch(`/api/erp/accounts/${id}`, { method: "DELETE" });
    setAccounts((prev) => prev.filter((a) => a.id !== id));
  }

  const typeLabel = (t: string) => ACCOUNT_TYPES.find((x) => x.value === t)?.label ?? t;

  return (
    <div>
      <PageHeader
        title="Contas Bancárias"
        subtitle={`${accounts.length} conta${accounts.length !== 1 ? "s" : ""} cadastrada${accounts.length !== 1 ? "s" : ""}`}
        actions={
          <button onClick={openNew} className="btn-primary">
            + Nova conta
          </button>
        }
      />

      <div className="card overflow-hidden">
        {accounts.length === 0 ? (
          <div className="px-6 py-16 text-center text-sm text-slate-400 dark:text-neutral-500">
            Nenhuma conta cadastrada ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Banco</th>
                <th className="table-th">Ag / Conta</th>
                <th className="table-th text-right">Saldo</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {accounts.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{a.name}</td>
                  <td className="table-td">{typeLabel(a.type)}</td>
                  <td className="table-td">{a.bankName || "—"}</td>
                  <td className="table-td text-xs">{a.agency ? `${a.agency} / ${a.accountNumber || "—"}` : "—"}</td>
                  <td className={`table-td text-right font-semibold tabular-nums ${a.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {formatCurrency(a.balance)}
                  </td>
                  <td className="table-td">
                    <span className={`pill ${a.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-200 dark:ring-neutral-700"}`}>
                      {a.active ? "Ativa" : "Inativa"}
                    </span>
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

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Conta" : "Nova Conta"}>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div>
            <label className="label">Nome da conta *</label>
            <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Banco</label>
              <select className="input" value={form.bankName ?? ""} onChange={(e) => setForm({ ...form, bankName: e.target.value })}>
                <option value="">— Selecione —</option>
                {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Agência (sem dígito)</label>
              <input className="input" value={form.agency ?? ""} onChange={(e) => setForm({ ...form, agency: e.target.value })} />
            </div>
            <div>
              <label className="label">Conta (com dígito)</label>
              <input className="input" value={form.accountNumber ?? ""} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de titular</label>
              <select className="input" value={form.holderType} onChange={(e) => setForm({ ...form, holderType: e.target.value })}>
                <option value="PESSOA_FISICA">Pessoa Física</option>
                <option value="PESSOA_JURIDICA">Pessoa Jurídica</option>
              </select>
            </div>
            <div>
              <label className="label">Saldo inicial</label>
              <input className="input" type="number" step="0.01" value={form.balance} onChange={(e) => setForm({ ...form, balance: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.canReceive} onChange={(e) => setForm({ ...form, canReceive: e.target.checked })} className="accent-brand-500" />
              Usar para receitas
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.canPay} onChange={(e) => setForm({ ...form, canPay: e.target.checked })} className="accent-brand-500" />
              Usar para despesas
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-brand-500" />
              Ativa
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "Salvando..." : form.id ? "Salvar alterações" : "Criar conta"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
