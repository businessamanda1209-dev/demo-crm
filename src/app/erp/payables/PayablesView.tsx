"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/format";

type Party = { id: string; legalName: string; tradeName: string | null };
type Category = { id: string; description: string };
type Account = { id: string; name: string };

type Payable = {
  id: string;
  description: string;
  amount: number;
  status: string;
  dueDate: string;
  competenceDate: string;
  paidAt: string | null;
  paymentMethod: string | null;
  recurrence: string | null;
  notes: string | null;
  partyId: string | null;
  categoryId: string | null;
  costCenterId: string | null;
  accountId: string | null;
  party: Party | null;
  category: Category | null;
  account: Account | null;
};

const STATUS_LABELS: Record<string, string> = { OPEN: "Em aberto", SCHEDULED: "Agendado", PAID: "Pago", OVERDUE: "Vencido" };
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  SCHEDULED: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  OVERDUE: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};

const PAYMENT_METHODS = ["Boleto", "Pix", "Transferência", "Cartão de débito", "Cartão de crédito", "Dinheiro", "Cheque", "Outro"];
const RECURRENCES = ["Não repete", "Diário", "Semanal", "Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"];

const EMPTY_FORM = {
  id: undefined as string | undefined,
  description: "", amount: "", status: "OPEN",
  dueDate: "", competenceDate: "", paidAt: "",
  paymentMethod: "", recurrence: "", notes: "",
  partyId: "", categoryId: "", costCenterId: "", accountId: "",
  newPartyName: "",
};

type Props = { initialPayables: Payable[]; parties: Party[]; categories: Category[]; accounts: Account[] };

export default function PayablesView({ initialPayables, parties, categories, accounts }: Props) {
  const router = useRouter();
  const [payables, setPayables] = useState(initialPayables);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const filtered = useMemo(() => {
    if (statusFilter === "ALL") return payables;
    return payables.filter((p) => p.status === statusFilter);
  }, [payables, statusFilter]);

  const sum = (arr: Payable[]) => arr.reduce((s, p) => s + p.amount, 0);
  const overdue = payables.filter((p) => p.status === "OVERDUE" || (p.status === "OPEN" && new Date(p.dueDate) < today));
  const todayDue = payables.filter((p) => { const d = new Date(p.dueDate); return d >= today && d < tomorrow && p.status !== "PAID"; });
  const upcoming = payables.filter((p) => p.status === "OPEN" && new Date(p.dueDate) >= tomorrow);
  const paid = payables.filter((p) => p.status === "PAID");

  function openNew() { setForm({ ...EMPTY_FORM }); setError(null); setOpen(true); }
  function openEdit(p: Payable) {
    setForm({
      id: p.id, description: p.description, amount: String(p.amount), status: p.status,
      dueDate: p.dueDate.slice(0, 10), competenceDate: p.competenceDate.slice(0, 10),
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : "",
      paymentMethod: p.paymentMethod ?? "", recurrence: p.recurrence ?? "", notes: p.notes ?? "",
      partyId: p.partyId ?? "", categoryId: p.categoryId ?? "",
      costCenterId: p.costCenterId ?? "", accountId: p.accountId ?? "",
      newPartyName: "",
    });
    setError(null); setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    let partyId = form.partyId || null;

    if (form.newPartyName.trim()) {
      const pr = await fetch("/api/erp/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalName: form.newPartyName.trim(), isSupplier: true }),
      });
      if (pr.ok) { const np = await pr.json(); partyId = np.id; }
    }

    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/payables/${form.id}` : "/api/erp/payables", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, partyId, amount: parseFloat(form.amount) || 0, paidAt: form.paidAt || null }),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    setOpen(false); router.refresh();
    if (isEdit) {
      setPayables((prev) => prev.map((p) => p.id === form.id ? { ...p, ...form, id: p.id, amount: parseFloat(form.amount), partyId, party: p.party } : p));
    } else {
      const created = await res.json();
      setPayables((prev) => [...prev, { ...created, amount: Number(created.amount) }]);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await fetch(`/api/erp/payables/${id}`, { method: "DELETE" });
    setPayables((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div>
      <PageHeader title="Contas a Pagar" subtitle="Gerencie suas despesas e compromissos financeiros."
        actions={<button onClick={openNew} className="btn-primary">+ Nova despesa</button>} />

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Vencidos", value: sum(overdue), color: "text-rose-600 dark:text-rose-400" },
          { label: "Vencem hoje", value: sum(todayDue), color: "text-amber-600 dark:text-amber-400" },
          { label: "A vencer", value: sum(upcoming), color: "text-sky-600 dark:text-sky-400" },
          { label: "Pagos", value: sum(paid), color: "text-emerald-600 dark:text-emerald-400" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500">{c.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${c.color}`}>{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", "OPEN", "OVERDUE", "SCHEDULED", "PAID"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? "bg-brand-500 text-white" : "bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 ring-1 ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"}`}>
            {s === "ALL" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhuma despesa encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Fornecedor</th>
                <th className="table-th">Descrição</th>
                <th className="table-th">Vencimento</th>
                <th className="table-th text-right">Valor</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td text-slate-500 dark:text-neutral-400">{p.party?.tradeName || p.party?.legalName || "—"}</td>
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{p.description}</td>
                  <td className="table-td">{formatDate(p.dueDate)}</td>
                  <td className="table-td text-right font-semibold tabular-nums">{formatCurrency(p.amount)}</td>
                  <td className="table-td"><span className={`pill ${STATUS_COLORS[p.status] ?? ""}`}>{STATUS_LABELS[p.status] ?? p.status}</span></td>
                  <td className="table-td text-right">
                    <button onClick={() => openEdit(p)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Editar</button>
                    <button onClick={() => remove(p.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Despesa" : "Nova Despesa"}>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div>
            <label className="label">Fornecedor</label>
            <select className="input" value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value, newPartyName: "" })}>
              <option value="">— Selecione ou crie abaixo —</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.tradeName || p.legalName}</option>)}
            </select>
          </div>
          {!form.partyId && (
            <div>
              <label className="label">Novo fornecedor (nome)</label>
              <input className="input" placeholder="Digite para criar" value={form.newPartyName} onChange={(e) => setForm({ ...form, newPartyName: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Descrição *</label>
            <input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor *</label>
              <input className="input" type="number" step="0.01" min="0" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Competência *</label>
              <input className="input" type="date" required value={form.competenceDate} onChange={(e) => setForm({ ...form, competenceDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Vencimento *</label>
              <input className="input" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— Nenhuma —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Conta de pagamento</label>
              <select className="input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">— Nenhuma —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Forma de pagamento</label>
              <select className="input" value={form.paymentMethod ?? ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                <option value="">— Selecione —</option>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Recorrência</label>
              <select className="input" value={form.recurrence ?? ""} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                <option value="">— Selecione —</option>
                {RECURRENCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          {form.status === "PAID" && (
            <div>
              <label className="label">Data de pagamento</label>
              <input className="input" type="date" value={form.paidAt ?? ""} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
            </div>
          )}
          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : form.id ? "Salvar" : "Criar despesa"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
