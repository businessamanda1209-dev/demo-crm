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
const RECEIVING_METHODS = ["Boleto", "PIX", "Transferência", "Dinheiro", "Cartão", "Cheque", "Outro"];

const EMPTY_FORM = {
  id: undefined as string | undefined,
  description: "", amount: "", type: "SERVICO", status: "OPEN",
  dueDate: "", competenceDate: new Date().toISOString().slice(0, 10), receivedAt: "",
  receivingMethod: "", recurrence: "", notes: "",
  partyId: "", partyName: "",
  categoryId: "", costCenterId: "", accountId: "",
  referenceCode: "",
  received: false,
};

const EMPTY_FILTERS = { search: "", categoryId: "", costCenterId: "", accountId: "", paymentMethod: "", status: "ALL" };

type Props = {
  initialReceivables: Receivable[];
  parties: Party[];
  categories: Category[];
  accounts: Account[];
  costCenters: CostCenter[];
};

export default function ReceivablesView({ initialReceivables, parties: initialParties, categories, accounts, costCenters }: Props) {
  const [receivables, setReceivables] = useState(initialReceivables);
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
    return receivables.filter((r) => {
      if (!inPeriod(r.dueDate, period)) return false;
      if (filters.status !== "ALL" && r.status !== filters.status) return false;
      if (filters.categoryId && r.categoryId !== filters.categoryId) return false;
      if (filters.costCenterId && r.costCenterId !== filters.costCenterId) return false;
      if (filters.accountId && r.accountId !== filters.accountId) return false;
      if (filters.paymentMethod && (r.receivingMethod ?? "") !== filters.paymentMethod) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const partyName = (r.party?.tradeName || r.party?.legalName || "").toLowerCase();
        const desc = r.description.toLowerCase();
        if (!partyName.includes(q) && !desc.includes(q)) return false;
      }
      return true;
    });
  }, [receivables, period, filters]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const sum = (arr: Receivable[]) => arr.reduce((s, r) => s + r.amount, 0);
  const overdue = filtered.filter((r) => r.status === "OVERDUE" || (r.status === "OPEN" && new Date(r.dueDate) < today));
  const todayDue = filtered.filter((r) => { const d = new Date(r.dueDate); return d >= today && d < tomorrow && r.status !== "RECEIVED"; });
  const upcoming = filtered.filter((r) => r.status === "OPEN" && new Date(r.dueDate) >= tomorrow);
  const received = filtered.filter((r) => r.status === "RECEIVED");

  function openNew() {
    setForm({ ...EMPTY_FORM, competenceDate: new Date().toISOString().slice(0, 10) });
    setError(null); setOpen(true);
  }
  function openEdit(r: Receivable) {
    setForm({
      id: r.id, description: r.description, amount: formatBRLInput(r.amount), type: r.type, status: r.status,
      dueDate: r.dueDate.slice(0, 10), competenceDate: r.competenceDate.slice(0, 10),
      receivedAt: r.receivedAt ? r.receivedAt.slice(0, 10) : "",
      receivingMethod: r.receivingMethod ?? "", recurrence: r.recurrence ?? "", notes: r.notes ?? "",
      partyId: r.partyId ?? "", partyName: r.party ? (r.party.tradeName || r.party.legalName) : "",
      categoryId: r.categoryId ?? "", costCenterId: r.costCenterId ?? "", accountId: r.accountId ?? "",
      referenceCode: "",
      received: r.status === "RECEIVED",
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
    const status = form.received ? "RECEIVED" : (form.status || "OPEN");
    const payload = {
      description: form.description.trim(),
      amount,
      type: form.type,
      status,
      competenceDate: form.competenceDate || form.dueDate,
      dueDate: form.dueDate,
      receivedAt: form.received ? (form.receivedAt || new Date().toISOString().slice(0, 10)) : null,
      receivingMethod: form.receivingMethod || null,
      recurrence: form.recurrence || null,
      notes: form.notes || null,
      partyId: form.partyId || null,
      categoryId: form.categoryId || null,
      costCenterId: form.costCenterId || null,
      accountId: form.accountId || null,
    };
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/receivables/${form.id}` : "/api/erp/receivables", {
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
      setReceivables((prev) => prev.map((r) => r.id === form.id ? {
        ...r,
        ...payload,
        competenceDate: new Date(payload.competenceDate).toISOString(),
        dueDate: new Date(payload.dueDate).toISOString(),
        receivedAt: payload.receivedAt ? new Date(payload.receivedAt).toISOString() : null,
        party, category, account,
      } : r));
    } else {
      const created = await res.json();
      setReceivables((prev) => [...prev, { ...created, amount: Number(created.amount) }]);
    }
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta receita?")) return;
    await fetch(`/api/erp/receivables/${id}`, { method: "DELETE" });
    setReceivables((prev) => prev.filter((r) => r.id !== id));
  }

  function onPartyCreated(p: PartyOption) {
    setParties((prev) => [...prev, { id: p.id, legalName: p.legalName, tradeName: p.tradeName ?? null, document: p.document ?? null }]);
  }

  return (
    <div>
      <PageHeader title="Contas a Receber" subtitle="Gerencie suas receitas e cobranças."
        actions={<button onClick={openNew} className="btn-primary">+ Nova receita</button>} />

      {/* Period filter */}
      <div className="mb-4">
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
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

      {/* Filter row */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input
          className="input h-9 py-0 text-xs w-auto min-w-[200px]"
          placeholder="Buscar cliente ou descrição..."
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
            <label className="label">Forma de recebimento</label>
            <select className="input" value={filters.paymentMethod} onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}>
              <option value="">Todas</option>
              {RECEIVING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar receita" : "Nova receita"} size="lg">
        <form onSubmit={submit} className="space-y-5">
          {error && <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{error}</div>}

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Informações do lançamento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Cliente</label>
                <PartySelector
                  value={form.partyId}
                  options={parties}
                  onChange={({ id, name }) => setForm({ ...form, partyId: id, partyName: name })}
                  onCreated={onPartyCreated}
                  role="customer"
                  placeholder="Selecionar cliente"
                />
              </div>
              <div>
                <label className="label">Data de competência</label>
                <input type="date" className="input" value={form.competenceDate} onChange={(e) => setForm({ ...form, competenceDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
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
              <div>
                <label className="label">Código de referência</label>
                <input className="input" value={form.referenceCode} onChange={(e) => setForm({ ...form, referenceCode: e.target.value })} />
              </div>
            </div>
          </section>

          <div className="border-t border-slate-100 dark:border-neutral-800" />

          <section>
            <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">Condição de recebimento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="label">Vencimento *</label>
                <input type="date" className="input" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="label">Forma de recebimento</label>
                <select className="input" value={form.receivingMethod} onChange={(e) => setForm({ ...form, receivingMethod: e.target.value })}>
                  <option value="">— Selecione —</option>
                  {RECEIVING_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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
                  <input type="checkbox" className="accent-brand-500" checked={form.received} onChange={(e) => setForm({ ...form, received: e.target.checked })} />
                  Recebido
                </label>
              </div>
              {form.received && (
                <div>
                  <label className="label">Data de recebimento</label>
                  <input type="date" className="input" value={form.receivedAt} onChange={(e) => setForm({ ...form, receivedAt: e.target.value })} />
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
