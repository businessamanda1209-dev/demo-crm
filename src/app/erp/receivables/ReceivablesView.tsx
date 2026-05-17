"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/format";

type Party = { id: string; legalName: string; tradeName: string | null };
type Category = { id: string; description: string };
type Account = { id: string; name: string };

type Receivable = {
  id: string;
  description: string;
  amount: number;
  type: string;
  status: string;
  dueDate: string;
  competenceDate: string;
  receivedAt: string | null;
  receivingMethod: string | null;
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

const STATUS_LABELS: Record<string, string> = { OPEN: "Em aberto", SCHEDULED: "Agendado", RECEIVED: "Recebido", OVERDUE: "Vencido" };
const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-500/30",
  SCHEDULED: "bg-indigo-50 text-indigo-700 ring-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-500/30",
  RECEIVED: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  OVERDUE: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
};
const TYPE_LABELS: Record<string, string> = { SERVICO: "Serviço", PRODUTO: "Produto", DIVERSA: "Diversa" };
const RECEIVING_METHODS = ["Pix", "Boleto", "Transferência", "Cartão de débito", "Cartão de crédito", "Dinheiro", "Cheque", "Outro"];
const RECURRENCES = ["Não repete", "Diário", "Semanal", "Quinzenal", "Mensal", "Bimestral", "Trimestral", "Semestral", "Anual"];

const EMPTY_FORM = {
  id: undefined as string | undefined,
  description: "", amount: "", type: "SERVICO", status: "OPEN",
  dueDate: "", competenceDate: "", receivedAt: "",
  receivingMethod: "", recurrence: "", notes: "",
  partyId: "", categoryId: "", costCenterId: "", accountId: "",
  newPartyName: "",
};

type Props = { initialReceivables: Receivable[]; parties: Party[]; categories: Category[]; accounts: Account[] };

export default function ReceivablesView({ initialReceivables, parties, categories, accounts }: Props) {
  const router = useRouter();
  const [receivables, setReceivables] = useState(initialReceivables);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

  const filtered = useMemo(() => statusFilter === "ALL" ? receivables : receivables.filter((r) => r.status === statusFilter), [receivables, statusFilter]);
  const sum = (arr: Receivable[]) => arr.reduce((s, r) => s + r.amount, 0);
  const overdue = receivables.filter((r) => r.status === "OVERDUE" || (r.status === "OPEN" && new Date(r.dueDate) < today));
  const todayDue = receivables.filter((r) => { const d = new Date(r.dueDate); return d >= today && d < tomorrow && r.status !== "RECEIVED"; });
  const upcoming = receivables.filter((r) => r.status === "OPEN" && new Date(r.dueDate) >= tomorrow);
  const received = receivables.filter((r) => r.status === "RECEIVED");

  function openNew() { setForm({ ...EMPTY_FORM }); setError(null); setOpen(true); }
  function openEdit(r: Receivable) {
    setForm({
      id: r.id, description: r.description, amount: String(r.amount), type: r.type, status: r.status,
      dueDate: r.dueDate.slice(0, 10), competenceDate: r.competenceDate.slice(0, 10),
      receivedAt: r.receivedAt ? r.receivedAt.slice(0, 10) : "",
      receivingMethod: r.receivingMethod ?? "", recurrence: r.recurrence ?? "", notes: r.notes ?? "",
      partyId: r.partyId ?? "", categoryId: r.categoryId ?? "",
      costCenterId: r.costCenterId ?? "", accountId: r.accountId ?? "",
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
        body: JSON.stringify({ legalName: form.newPartyName.trim(), isCustomer: true }),
      });
      if (pr.ok) { const np = await pr.json(); partyId = np.id; }
    }
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/receivables/${form.id}` : "/api/erp/receivables", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, partyId, amount: parseFloat(form.amount) || 0, receivedAt: form.receivedAt || null }),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    setOpen(false); router.refresh();
    if (!isEdit) {
      const created = await res.json();
      setReceivables((prev) => [...prev, { ...created, amount: Number(created.amount) }]);
    } else {
      setReceivables((prev) => prev.map((r) => r.id === form.id ? { ...r, ...form, id: r.id, amount: parseFloat(form.amount), partyId, party: r.party } : r));
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta receita?")) return;
    await fetch(`/api/erp/receivables/${id}`, { method: "DELETE" });
    setReceivables((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div>
      <PageHeader title="Contas a Receber" subtitle="Gerencie suas receitas e cobranças."
        actions={<button onClick={openNew} className="btn-primary">+ Nova receita</button>} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Vencidos", value: sum(overdue), color: "text-rose-600 dark:text-rose-400" },
          { label: "Vencem hoje", value: sum(todayDue), color: "text-amber-600 dark:text-amber-400" },
          { label: "A vencer", value: sum(upcoming), color: "text-sky-600 dark:text-sky-400" },
          { label: "Recebidos", value: sum(received), color: "text-emerald-600 dark:text-emerald-400" },
        ].map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500">{c.label}</p>
            <p className={`mt-1 text-lg font-bold tabular-nums ${c.color}`}>{formatCurrency(c.value)}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {["ALL", "OPEN", "OVERDUE", "SCHEDULED", "RECEIVED"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === s ? "bg-brand-500 text-white" : "bg-white dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 ring-1 ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"}`}>
            {s === "ALL" ? "Todos" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhuma receita encontrada.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Cliente</th>
                <th className="table-th">Descrição</th>
                <th className="table-th">Tipo</th>
                <th className="table-th">Vencimento</th>
                <th className="table-th text-right">Valor</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td text-slate-500 dark:text-neutral-400">{r.party?.tradeName || r.party?.legalName || "—"}</td>
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{r.description}</td>
                  <td className="table-td text-xs">{TYPE_LABELS[r.type] ?? r.type}</td>
                  <td className="table-td">{formatDate(r.dueDate)}</td>
                  <td className="table-td text-right font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(r.amount)}</td>
                  <td className="table-td"><span className={`pill ${STATUS_COLORS[r.status] ?? ""}`}>{STATUS_LABELS[r.status] ?? r.status}</span></td>
                  <td className="table-td text-right">
                    <button onClick={() => openEdit(r)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Editar</button>
                    <button onClick={() => remove(r.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Receita" : "Nova Receita"}>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div>
            <label className="label">Cliente</label>
            <select className="input" value={form.partyId} onChange={(e) => setForm({ ...form, partyId: e.target.value, newPartyName: "" })}>
              <option value="">— Selecione ou crie abaixo —</option>
              {parties.map((p) => <option key={p.id} value={p.id}>{p.tradeName || p.legalName}</option>)}
            </select>
          </div>
          {!form.partyId && (
            <div>
              <label className="label">Novo cliente (nome)</label>
              <input className="input" placeholder="Digite para criar" value={form.newPartyName} onChange={(e) => setForm({ ...form, newPartyName: e.target.value })} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo *</label>
              <select className="input" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
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
              <label className="label">Competência *</label>
              <input className="input" type="date" required value={form.competenceDate} onChange={(e) => setForm({ ...form, competenceDate: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Vencimento *</label>
              <input className="input" type="date" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoria</label>
              <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                <option value="">— Nenhuma —</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Conta de recebimento</label>
              <select className="input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                <option value="">— Nenhuma —</option>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Forma de recebimento</label>
              <select className="input" value={form.receivingMethod ?? ""} onChange={(e) => setForm({ ...form, receivingMethod: e.target.value })}>
                <option value="">— Selecione —</option>
                {RECEIVING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Recorrência</label>
              <select className="input" value={form.recurrence ?? ""} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
                <option value="">— Selecione —</option>
                {RECURRENCES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            {form.status === "RECEIVED" && (
              <div>
                <label className="label">Data de recebimento</label>
                <input className="input" type="date" value={form.receivedAt ?? ""} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
              </div>
            )}
          </div>
          <div>
            <label className="label">Observações</label>
            <textarea className="input" rows={2} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : form.id ? "Salvar" : "Criar receita"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
