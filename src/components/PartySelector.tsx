"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type PartyOption = {
  id: string;
  legalName: string;
  tradeName?: string | null;
  document?: string | null;
};

type Props = {
  value: string;
  options: PartyOption[];
  onChange: (party: { id: string; name: string }) => void;
  onCreated?: (party: PartyOption) => void;
  placeholder?: string;
  role?: "customer" | "supplier";
};

export default function PartySelector({
  value,
  options,
  onChange,
  onCreated,
  placeholder = "Selecionar",
  role = "customer",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", document: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setCreating(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const selected = useMemo(() => options.find((o) => o.id === value), [options, value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.legalName.toLowerCase().includes(q) ||
        (o.tradeName ?? "").toLowerCase().includes(q) ||
        (o.document ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  function displayName(o: PartyOption) {
    return o.tradeName?.trim() || o.legalName;
  }

  const [createError, setCreateError] = useState<string | null>(null);

  async function submitNew() {
    if (!form.name.trim()) { setCreateError("Nome é obrigatório."); return; }
    setSubmitting(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/erp/parties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: form.name.trim(),
          document: form.document || null,
          email: form.email || null,
          phone: form.phone || null,
          isCustomer: role === "customer",
          isSupplier: role === "supplier",
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setCreateError(err.error || "Erro ao salvar.");
        return;
      }
      const np = await res.json();
      onCreated?.(np);
      onChange({ id: np.id, name: displayName(np) });
      setOpen(false); setCreating(false);
      setForm({ name: "", document: "", email: "", phone: "" });
    } catch (e) {
      setCreateError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      submitNew();
    }
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="input w-full text-left flex items-center justify-between"
      >
        <span className={selected ? "" : "text-slate-400 dark:text-neutral-500"}>
          {selected ? displayName(selected) : placeholder}
        </span>
        <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-neutral-900 ring-1 ring-slate-200 dark:ring-neutral-800 rounded-lg shadow-lg max-h-80 overflow-hidden flex flex-col">
          {!creating ? (
            <>
              <div className="p-2 border-b border-slate-100 dark:border-neutral-800">
                <input
                  autoFocus
                  className="input"
                  placeholder="Buscar..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="overflow-y-auto flex-1 py-1">
                {filtered.length === 0 ? (
                  <p className="px-3 py-3 text-xs text-slate-400">Nenhum encontrado.</p>
                ) : (
                  filtered.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-neutral-800/60 text-sm"
                      onClick={() => { onChange({ id: o.id, name: displayName(o) }); setOpen(false); }}
                    >
                      <div className="font-medium text-slate-800 dark:text-neutral-100">{displayName(o)}</div>
                      {o.document && <div className="text-xs text-slate-400 dark:text-neutral-500">{o.document}</div>}
                    </button>
                  ))
                )}
              </div>
              <button
                type="button"
                onClick={() => { setCreating(true); setForm({ ...form, name: query }); }}
                className="px-3 py-2 text-sm text-brand-600 dark:text-brand-400 border-t border-slate-100 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800/60 text-left"
              >
                + Adicionar novo
              </button>
            </>
          ) : (
            <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
              {createError && <p className="text-xs text-rose-500">{createError}</p>}
              <input autoFocus className="input" placeholder="Nome *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} onKeyDown={handleKeyDown} />
              <input className="input" placeholder="CPF / CNPJ" value={form.document} onChange={(e) => setForm({ ...form, document: e.target.value })} onKeyDown={handleKeyDown} />
              <input className="input" placeholder="E-mail" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} onKeyDown={handleKeyDown} />
              <input className="input" placeholder="Telefone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} onKeyDown={handleKeyDown} />
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="btn-secondary text-xs px-3 py-1.5" onClick={() => { setCreating(false); setCreateError(null); }}>Cancelar</button>
                <button
                  type="button"
                  disabled={submitting}
                  className="btn-primary text-xs px-3 py-1.5"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); submitNew(); }}
                >
                  {submitting ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
