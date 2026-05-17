"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

type Party = {
  id: string;
  personType: string;
  document: string | null;
  legalName: string;
  tradeName: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  notes: string | null;
  active: boolean;
  isCustomer: boolean;
  isSupplier: boolean;
};

type Role = "customer" | "supplier";

const EMPTY = {
  id: undefined as string | undefined,
  personType: "PESSOA_JURIDICA",
  document: "",
  legalName: "",
  tradeName: "",
  email: "",
  phone: "",
  mobile: "",
  notes: "",
  active: true,
};

export default function PartiesView({ initialParties, role }: { initialParties: Party[]; role: Role }) {
  const isCustomer = role === "customer";
  const labels = {
    title: isCustomer ? "Clientes" : "Fornecedores",
    subtitle: isCustomer ? "Gerencie sua base de clientes." : "Gerencie sua base de fornecedores.",
    add: isCustomer ? "Novo cliente" : "Novo fornecedor",
    formTitle: isCustomer ? "Cliente" : "Fornecedor",
  };

  const [parties, setParties] = useState<Party[]>(initialParties);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return parties.filter((p) => {
      if (statusFilter === "ACTIVE" && !p.active) return false;
      if (statusFilter === "INACTIVE" && p.active) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!p.legalName.toLowerCase().includes(q) && !(p.tradeName ?? "").toLowerCase().includes(q) && !(p.document ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [parties, search, statusFilter]);

  function openNew() { setForm({ ...EMPTY }); setError(null); setOpen(true); }
  function openEdit(p: Party) {
    setForm({
      id: p.id,
      personType: p.personType,
      document: p.document ?? "",
      legalName: p.legalName,
      tradeName: p.tradeName ?? "",
      email: p.email ?? "",
      phone: p.phone ?? "",
      mobile: p.mobile ?? "",
      notes: p.notes ?? "",
      active: p.active,
    });
    setError(null); setOpen(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.legalName.trim()) { setError("Nome / Razão social é obrigatório."); return; }
    setSubmitting(true);
    const payload = {
      ...form,
      isCustomer,
      isSupplier: !isCustomer,
    };
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/parties/${form.id}` : "/api/erp/parties", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    if (isEdit) {
      setParties((prev) => prev.map((p) => (p.id === form.id ? { ...p, ...payload } as Party : p)));
    } else {
      const created = await res.json();
      setParties((prev) => [...prev, created]);
    }
    setOpen(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este cadastro?")) return;
    await fetch(`/api/erp/parties/${id}`, { method: "DELETE" });
    setParties((prev) => prev.filter((p) => p.id !== id));
  }

  async function toggleActive(p: Party) {
    const res = await fetch(`/api/erp/parties/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, active: !p.active }),
    });
    if (res.ok) setParties((prev) => prev.map((x) => x.id === p.id ? { ...x, active: !x.active } : x));
  }

  return (
    <div>
      <PageHeader
        title={labels.title}
        subtitle={labels.subtitle}
        actions={<button onClick={openNew} className="btn-primary">+ {labels.add}</button>}
      />

      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <input className="input h-9 py-0 text-xs w-auto min-w-[220px]" placeholder="Buscar nome, CNPJ ou CPF..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          {(["ACTIVE", "INACTIVE", "ALL"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`h-9 px-3 rounded-lg text-xs font-medium ${statusFilter === s ? "bg-brand-500 text-white" : "ring-1 ring-slate-200 dark:ring-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800"}`}
            >
              {s === "ACTIVE" ? "Ativo" : s === "INACTIVE" ? "Inativo" : "Todos"}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhum cadastro encontrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Nome</th>
                <th className="table-th">CPF/CNPJ</th>
                <th className="table-th">E-mail</th>
                <th className="table-th">Telefone</th>
                <th className="table-th">Situação</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{p.tradeName || p.legalName}</td>
                  <td className="table-td text-xs">{p.document || "—"}</td>
                  <td className="table-td">{p.email || "—"}</td>
                  <td className="table-td">{p.mobile || p.phone || "—"}</td>
                  <td className="table-td">
                    <span className={`pill ${p.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-200 dark:ring-neutral-700"}`}>
                      {p.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="table-td text-right">
                    <button onClick={() => openEdit(p)} className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 mr-3">Editar</button>
                    <button onClick={() => toggleActive(p)} className="text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 mr-3">{p.active ? "Inativar" : "Ativar"}</button>
                    <button onClick={() => remove(p.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? `Editar ${labels.formTitle}` : `Novo ${labels.formTitle}`} size="lg">
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">{error}</div>}

          <div>
            <label className="label">Tipo de pessoa</label>
            <div className="flex gap-2">
              {[
                { v: "PESSOA_FISICA", l: "Pessoa Física (PF)" },
                { v: "PESSOA_JURIDICA", l: "Pessoa Jurídica (PJ)" },
              ].map((t) => (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => setForm({ ...form, personType: t.v })}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ring-1 ${form.personType === t.v ? "ring-brand-500 bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300" : "ring-slate-200 dark:ring-neutral-700"}`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{form.personType === "PESSOA_FISICA" ? "CPF" : "CNPJ"}</label>
              <input className="input" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} />
            </div>
            <div>
              <label className="label">{form.personType === "PESSOA_FISICA" ? "Nome completo *" : "Razão social *"}</label>
              <input className="input" required value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} />
            </div>
            {form.personType === "PESSOA_JURIDICA" && (
              <div className="sm:col-span-2">
                <label className="label">Nome fantasia</label>
                <input className="input" value={form.tradeName} onChange={(e) => setForm({ ...form, tradeName: e.target.value })} />
              </div>
            )}
            <div>
              <label className="label">E-mail</label>
              <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Celular</label>
              <input className="input" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            </div>
            <div>
              <label className="label">Situação</label>
              <select className="input" value={form.active ? "1" : "0"} onChange={(e) => setForm({ ...form, active: e.target.value === "1" })}>
                <option value="1">Ativo</option>
                <option value="0">Inativo</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Observações</label>
              <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : "Salvar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
