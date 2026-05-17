"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import Modal from "@/components/Modal";

type Category = { id: string; type: string; description: string; active: boolean };
const EMPTY: Omit<Category, "id"> & { id?: string } = { type: "EXPENSE", description: "", active: true };

export default function CategoriesView({ initialCategories }: { initialCategories: Category[] }) {
  const router = useRouter();
  const [cats, setCats] = useState(initialCategories);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openNew() { setForm(EMPTY); setError(null); setOpen(true); }
  function openEdit(c: Category) { setForm(c); setError(null); setOpen(true); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true); setError(null);
    const isEdit = !!form.id;
    const res = await fetch(isEdit ? `/api/erp/categories/${form.id}` : "/api/erp/categories", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    if (!res.ok) { setError("Erro ao salvar."); return; }
    setOpen(false);
    if (isEdit) {
      setCats((prev) => prev.map((c) => (c.id === form.id ? { ...c, ...form, id: c.id } as Category : c)));
    } else {
      const created = await res.json();
      setCats((prev) => [...prev, created]);
    }
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta categoria?")) return;
    await fetch(`/api/erp/categories/${id}`, { method: "DELETE" });
    setCats((prev) => prev.filter((c) => c.id !== id));
  }

  const revenue = cats.filter((c) => c.type === "REVENUE");
  const expense = cats.filter((c) => c.type === "EXPENSE");

  function Section({ title, items }: { title: string; items: Category[] }) {
    return (
      <div className="card overflow-hidden mb-4">
        <div className="px-5 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-neutral-400">{title}</h3>
        </div>
        {items.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate-400 dark:text-neutral-500">Nenhuma categoria.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
            {items.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-slate-800 dark:text-neutral-100">{c.description}</span>
                  {!c.active && <span className="pill bg-slate-100 text-slate-500 ring-slate-200 dark:bg-neutral-800/50 dark:text-neutral-400 dark:ring-neutral-700">Inativa</span>}
                </div>
                <div>
                  <button onClick={() => openEdit(c)} className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 mr-3">Editar</button>
                  <button onClick={() => remove(c.id)} className="text-xs font-medium text-rose-500 hover:text-rose-700">Excluir</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Categorias"
        subtitle="Classifique receitas e despesas por categoria."
        actions={<button onClick={openNew} className="btn-primary">+ Nova categoria</button>}
      />

      <Section title="Receitas" items={revenue} />
      <Section title="Despesas" items={expense} />

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? "Editar Categoria" : "Nova Categoria"}>
        <form onSubmit={submit} className="space-y-4">
          {error && <p className="text-sm text-rose-500">{error}</p>}
          <div>
            <label className="label">Tipo *</label>
            <select className="input" required value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              <option value="REVENUE">Receita</option>
              <option value="EXPENSE">Despesa</option>
            </select>
          </div>
          <div>
            <label className="label">Descrição *</label>
            <input className="input" required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-brand-500" />
            Ativa
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
