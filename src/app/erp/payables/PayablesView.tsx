"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";
import PartySelector, { PartyOption } from "@/components/PartySelector";
import PeriodFilter from "@/components/PeriodFilter";
import { formatCurrency, formatDate } from "@/lib/format";
import { parseBRL, formatBRLInput } from "@/lib/currency";
import { defaultPeriod, inPeriod, PeriodState } from "@/lib/period";

type Party = { id: string; legalName: string; tradeName: string | null; document?: string | null };
type Category = { id: string; description: string };
type Account = { id: string; name: string };
type CostCenter = { id: string; name: string; code: string };

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

const PAYMENT_METHODS = ["Boleto", "PIX", "Transferência", "Dinheiro", "Cartão", "Cheque", "Outro"];

const EMPTY_FORM = {
  id: undefined as string | undefined,
  description: "", amount: "", status: "OPEN",
  dueDate: "", competenceDate: new Date().toISOString().slice(0, 10), paidAt: "",
  paymentMethod: "", recurrence: "", notes: "",
  partyId: "", partyName: "",
  categoryId: "", costCenterId: "", accountId: "",
  referenceCode: "",
  paid: false,
};

const EMPTY_FILTERS = { search: "", categoryId: "", costCenterId: "", accountId: "", paymentMethod: "", status: "ALL" };

type Props = {
  initialPayables: Payable[];
  parties: Party[];
  categories: Category[];
  accounts: Account[];
  costCenters: CostCenter[];
};

export default function PayablesView({ initialPayables, parties: initialParties, categories, accounts, costCenters }: Props) {
  const [payables, setPayables] = useState(initialPayables);
  const [parties, setParties] = useState<Party[]>(initialParties);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodState>(defaultPeriod());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.search) n++;
    if (filters.categoryId) n++;
    if (filters.costCenterId) n++;
    if (filters.accountId) n++;
    if (filters.paymentMethod) n++;
    if (filters.status && filters.status !== "ALL") n++;
    return n;
  }, [filters]);

  const filtered = useMemo(() => {
    return payables.filter((p) => {
      if (!inPeriod(p.dueDate, period)) return false;
      if (filters.status !== "ALL" && p.status !== filters.status) return false;
      if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
      if (filters.costCenterId && p.costCenterId !== filters.costCenterId) return false;
      if (filters.accountId && p.accountId !== filters.accountId) return false;
      if (filters.paymentMethod && (p.paymentMethod ?? "") !== filters.paymentMethod) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const partyName = (p.party?.tradeName || p.party?.legalName || "").toLowerCase();
        const desc = p.description.toLowerCase();
        if (!partyName.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [payables, period, filters]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const sum = (arr: Payable[]) => arr.reduce((s, p) => s + p.amount, 0);
  const overdue = filtered.filter((p) => p.status === "OVERDUE" || (p.status === "OPEN" && new Date(p.dueDate) < today));
  const todayDue = filtered.filter((p) => { const d = new Date(p.dueDate); return d >= today && d < tomorrow && p.status !== "PAID"; });
  const upcoming = filtered.filter((p) => p.status === "OPEN" && new Date(p.dueDate) >= tomorrow);
  const paid = filtered.filter((p) => p.status === "PAID");

  function openNew() {
    setForm({ ...EMPTY_FORM, competenceDate: new Date().toISOString().slice(0, 10) });
    setError(null); setOpen(true);
  }
  function openEdit(p: Payable) {
    setForm({
      id: p.id, description: p.description, amount: formatBRLInput(p.amount), status: p.status,
      dueDate: p.dueDate.slice(0, 10), competenceDate: p.competenceDate.slice(0, 10),
      paidAt: p.paidAt ? p.paidAt.slice(0, 10) : "",
      paymentMethod: p.paymentMethod ?? "", recurrence: p.recurrence ?? "", notes: p.notes ?? "",
      partyId: p.partyId ?? "", partyName: p.party ? (p.party.tradeName || p.party.legalName) : "",
      categoryId: p.categoryId ?? "", costCenterId: p.costCenterId ?? "", accountId: p.accountId ?? "",
      referenceCode: "",
      paid: p.status === "PAID",
    });
    setError(null); setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.description.trim()) { setError("Descrição é obrigatória."); return; }
    const amount = parseBRL(form.amount);
    if (!amount || amount <= 0) { setError("Informe um valor maior que zero."); return; }
    if (!form.dueDate) { setError("Vencimento é obrigatório."); return; }

    setSubmitting(true);
    const status = form.paid ? "PAID" : (form.status || "OPEN");
    const payload = {
      description: form.description.trim(),
      amount,
      status,
      competenceDate: form.competenceDate || form.dueDate,
      dueDate: form.dueDate,
      paidAt: form.paid ? (form.paidAt || new Date().toISOString().slice(0, 10)) : null,
      paymentMethod: form.paymentMethod || null,
      recurrence: form.recurrence || null,
      notes: form.notes || null,
      partyId: form.partyId || null,
      categoryId: form.categoryId || null,
      costCenterId: form.costCenterId || null,
      accountId: form.accountId || null,
    };
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/payables/${form.id}` : "/api/erp/payables", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    if (isEdit) {
      const party = parties.find((p) => p.id === payload.partyId) ?? null;
      const category = categories.find((c) => c.id === payload.categoryId) ?? null;
      const account = accounts.find((a) => a.id === payload.accountId) ?? null;
      setPayables((prev) => prev.map((p) => p.id === form.id ? {
        ...p,
        ...payload,
        competenceDate: new Date(payload.competenceDate).toISOString(),
        dueDate: new Date(payload.dueDate).toISOString(),
        paidAt: payload.paidAt ? new Date(payload.paidAt).toISOString() : null,
        party, category, account,
      } : p));
    } else {
      const created = await res.json();
      setPayables((prev) => [...prev, { ...created, amount: Number(created.amount) }]);
    }
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta despesa?")) return;
    await fetch(`/api/erp/payables/${id}`, { method: "DELETE" });
    setPayables((prev) => prev.filter((p) => p.id !== id));
  }

  function onPartyCreated(p: PartyOption) {
    setParties((prev) => [...prev, { id: p.id, legalName: p.legalName, tradeName: p.tradeName ?? null, document: p.document ?? null }]);
  }

  return (
    <div>
      <PageHeader title="Contas a Pagar" subtitle="Gerencie suas despesas e compromissos financeiros."
        actions={<button onClick={openNew} className="btn-primary">+ Nova despesa</button>} />

      <div className="mb-4">
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          className="input h-9 py-0 text-xs w-auto min-w-[200px]"
          placeholder="Buscar fornecedor ou descrição..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <button
          type="button"
          onClick={() => setShowFilters((s) => !s)}
          className="h-9 px-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-700 text-xs font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-neutral-800"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 6h18M6 12h12M10 18h4" strokeLinecap="round" /></svg>
          Mais filtros
          {activeFilterCount > 0 && (
            <span className="bg-brand-500 text-white rounded-full px-1.5 text-[10px] font-bold">{activeFilterCount}</span>
          )}
        </button>
        {activeFilterCount > 0 && (
          <button type="button" onClick={() => setFilters({ ...EMPTY_FILTERS })} className="text-xs text-slate-500 hover:text-slate-700 dark:text-neutral-400">
            Limpar filtros
          </button>
        )}
      </div>

      {showFilters && (
        <div className="card p-4 mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select className="input" value={filters.categoryId} onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}>
              <option value="">Todas</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Centro de custo</label>
            <select className="input" value={filters.costCenterId} onChange={(e) => setFilters({ ...filters, costCenterId: e.target.value })}>
              <option value="">Todos</option>
              {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Conta</label>
            <select className="input" value={filters.accountId} onChange={(e) => setFilters({ ...filters, accountId: e.target.value })}>
              <option value="">Todas</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Forma de pagamento</label>
            <select className="input" value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}>
              <option value="">Todas</option>
              {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Situação</label>
            <select className="input" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="ALL">Todos</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
      )}

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

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar despesa" : "Nova despesa"} size="lg">
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{error}</div>}

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Informações do lançamento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Fornecedor</label>
                <PartySelector
                  value={form.partyId}
                  options={parties}
                  onChange={({ id, name }) => setForm({ ...form, partyId: id, partyName: name })}
                  onCreated={onPartyCreated}
                  role="supplier"
                  placeholder="Selecionar fornecedor"
                />
              </div>
              <div>
                <label className="label">Data de competência</label>
                <input type="date" className="input" value={form.competenceDate} onChange={(e) => setForm({ ...form, competenceDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Código de referência</label>
                <input className="input" value={form.referenceCode} onChange={(e) => setForm({ ...form, referenceCode: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Descrição *</label>
                <input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className="label">Valor *</label>
                <input className="input" required inputMode="decimal" placeholder="0,00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Categoria</label>
                <select className="input" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
                  <option value="">— Nenhuma —</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.description}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Centro de custo</label>
                <select className="input" value={form.costCenterId} onChange={(e) => setForm({ ...form, costCenterId: e.target.value })}>
                  <option value="">— Nenhum —</option>
                  {costCenters.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                </select>
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100 dark:border-neutral-800" />

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Condição de pagamento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Vencimento *</label>
                <input type="date" className="input" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Forma de pagamento</label>
                <select className="input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Conta</label>
                <select className="input" value={form.accountId} onChange={(e) => setForm({ ...form, accountId: e.target.value })}>
                  <option value="">— Nenhuma —</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" className="accent-brand-500" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} />
                  Pago
                </label>
              </div>
              {form.paid && (
                <div>
                  <label className="label">Data de pagamento</label>
                  <input type="date" className="input" value={form.paidAt} onChange={(e) => setForm({ ...form, paidAt: e.target.value })} />
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="label">Observações</label>
                <textarea className="input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
