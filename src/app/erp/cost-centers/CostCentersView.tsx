"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

type CC = { id: string; code: string; name: string; active: boolean };
const EMPTY: Omit<CC, "id"> & { id?: string } = { code: "", name: "", active: true };

export default function CostCentersView({ initialCostCenters }: { initialCostCenters: CC[] }) {
  const router = useRouter();
  const [ccs, setCcs] = useState(initialCostCenters);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(c: CC) { setForm(c); setError(null); setOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/cost-centers/${form.id}` : "/api/erp/cost-centers", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    setOpen(false);
    if (isEdit) {
      setCcs((prev) => prev.map((c) => (c.id === form.id ? { ...c, ...form, id: c.id } as CC : c)));
    } else {
      const created = await res.json();
      setCcs((prev) => [...prev, created]);
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir este centro de custo?")) return;
    await fetch(`/api/erp/cost-centers/${id}`, { method: "DELETE" });
    setCcs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <PageHeader
        title="Centros de Custo"
        subtitle={`${ccs.length} centro${ccs.length !== 1 ? "s" : ""} de custo cadastrado${ccs.length !== 1 ? "s" : ""}`}
        actions={<button onClick={openNew} className="btn-primary">+ Novo centro</button>}
      />

      <div className="card overflow-hidden">
        {ccs.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-neutral-500">Nenhum centro de custo cadastrado.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="table-th">Código</th>
                <th className="table-th">Nome</th>
                <th className="table-th">Status</th>
                <th className="table-th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {ccs.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-neutral-900/40">
                  <td className="table-td font-mono text-xs">{c.code}</td>
                  <td className="table-td font-medium text-slate-900 dark:text-neutral-100">{c.name}</td>
                  <td className="table-td">
                    <span className={`pill ${c.active ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30" : "bg-slate-100 text-slate-600 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-200 dark:ring-neutral-700"}`}>
                      {c.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="table-td text-right">
                    <button onClick={() => openEdit(c)} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 mr-3">Editar</button>
                    <button onClick={() => remove(c.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Centro de Custo" : "Novo Centro de Custo"}>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Código *</label>
              <input className="input" required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Nome *</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-brand-500" />
            Ativo
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={submitting} className="btn-primary">{submitting ? "Salvando..." : form.id ? "Salvar" : "Criar"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
