"use client";

import { useEffect, useState } from "react";

type Attachment = {
  id: string;
  filename: string;
  fileUrl: string;
  fileType: string;
  description: string | null;
  createdAt: string;
};

const FILE_TYPES = [
  { v: "invoice", l: "Fatura" },
  { v: "fiscal_doc", l: "Documento fiscal" },
  { v: "other", l: "Outros" },
];

const STORAGE_CONFIGURED = false; // TODO: flip when Supabase Storage is wired up

export default function AttachmentsSection({
  payableId,
  receivableId,
}: {
  payableId?: string;
  receivableId?: string;
}) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [filename, setFilename] = useState("");
  const [fileType, setFileType] = useState("invoice");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!payableId && !receivableId) {
      setLoaded(true);
      return;
    }
    const q = payableId ? `payableId=${payableId}` : `receivableId=${receivableId}`;
    fetch(`/api/erp/attachments?${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setItems(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [payableId, receivableId]);

  async function add() {
    setError(null);
    if (!filename.trim()) {
      setError("Informe o nome do arquivo.");
      return;
    }
    if (fileType === "other" && !description.trim()) {
      setError("Descrição é obrigatória para o tipo 'Outros'.");
      return;
    }
    setSubmitting(true);
    const res = await fetch("/api/erp/attachments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payableId,
        receivableId,
        filename: filename.trim(),
        fileType,
        description: description.trim() || null,
        fileUrl: "", // placeholder
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Erro ao salvar anexo.");
      return;
    }
    const created = await res.json();
    setItems((prev) => [created, ...prev]);
    setFilename("");
    setDescription("");
    setFileType("invoice");
  }

  async function remove(id: string) {
    if (!confirm("Remover anexo?")) return;
    await fetch(`/api/erp/attachments/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((x) => x.id !== id));
  }

  const ftLabel = (v: string) => FILE_TYPES.find((t) => t.v === v)?.l || v;

  return (
    <section>
      <h4 className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 dark:text-neutral-500 mb-3">
        Anexos
      </h4>

      {!STORAGE_CONFIGURED && (
        <p className="mb-3 text-[11px] text-amber-600 dark:text-amber-400">
          Upload de arquivos requer configuração do Supabase Storage. Por ora, registre apenas o
          nome e o tipo.
        </p>
      )}

      {error && (
        <p className="mb-2 text-xs text-rose-500">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
        <input
          className="input"
          placeholder="Nome do arquivo (ex: nf-12345.pdf)"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
        />
        <select className="input" value={fileType} onChange={(e) => setFileType(e.target.value)}>
          {FILE_TYPES.map((t) => (
            <option key={t.v} value={t.v}>{t.l}</option>
          ))}
        </select>
        {fileType === "other" && (
          <input
            className="input sm:col-span-2"
            placeholder="Descrição do arquivo *"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={submitting}
        className="btn-secondary text-xs px-3 py-1.5"
      >
        {submitting ? "Salvando..." : "+ Adicionar anexo"}
      </button>

      <div className="mt-3 space-y-1.5">
        {!loaded && <p className="text-xs text-slate-400">Carregando...</p>}
        {loaded && items.length === 0 && (
          <p className="text-xs text-slate-400 dark:text-neutral-500">Nenhum anexo.</p>
        )}
        {items.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between gap-3 rounded-lg ring-1 ring-slate-200 dark:ring-neutral-800 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800 dark:text-neutral-100 truncate">
                {a.filename}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-neutral-500">
                {ftLabel(a.fileType)}
                {a.description ? ` · ${a.description}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {a.fileUrl ? (
                <a
                  href={a.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
                >
                  Baixar
                </a>
              ) : (
                <span className="text-[10px] text-slate-400">sem arquivo</span>
              )}
              <button
                type="button"
                onClick={() => remove(a.id)}
                className="text-xs text-rose-500 hover:text-rose-700"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
