"use client";

import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type Message = {
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
};

type Action = {
  id: string;
  type: string;
  status: "DRAFT" | "APPROVED" | "REJECTED" | "EXECUTED" | "FAILED";
  payload: Record<string, any>;
  errorMessage: string | null;
  targetId: string | null;
  createdAt: string;
};

type Full = Conversation & { messages: Message[]; actions: Action[] };

const ACTION_LABELS: Record<string, string> = {
  create_customer: "Cadastrar cliente",
  create_supplier: "Cadastrar fornecedor",
  create_payable: "Lançar despesa",
  create_receivable: "Lançar receita",
  create_category: "Criar categoria",
  create_cost_center: "Criar centro de custo",
};

const TARGET_LINKS: Record<string, string> = {
  create_customer: "/erp/customers",
  create_supplier: "/erp/suppliers",
  create_payable: "/erp/payables",
  create_receivable: "/erp/receivables",
  create_category: "/erp/categories",
  create_cost_center: "/erp/cost-centers",
};

function formatPayload(type: string, p: Record<string, any>): string {
  const skip = new Set(["_description"]);
  switch (type) {
    case "create_customer":
    case "create_supplier":
      return `Nome: ${p.legalName}${p.document ? ` · Doc: ${p.document}` : ""}${p.email ? ` · ${p.email}` : ""}`;
    case "create_category":
      return `${p.description} (${p.type === "REVENUE" ? "Receita" : "Despesa"})`;
    case "create_cost_center":
      return `${p.name} · código ${p.code}`;
    case "create_payable":
    case "create_receivable":
      return `${p.description} — R$ ${Number(p.amount).toFixed(2)} · venc. ${new Date(p.dueDate).toLocaleDateString("pt-BR")}`;
    default:
      return Object.entries(p)
        .filter(([k]) => !skip.has(k))
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");
  }
}

export default function LibaAiView({ initialConversations }: { initialConversations: Conversation[] }) {
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [full, setFull] = useState<Full | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeId) { setFull(null); return; }
    fetch(`/api/erp/ai/conversations/${activeId}`)
      .then((r) => r.json())
      .then((d) => setFull(d))
      .catch(() => setFull(null));
  }, [activeId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [full?.messages.length]);

  async function newConversation() {
    const res = await fetch("/api/erp/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Nova conversa" }),
    });
    if (!res.ok) return;
    const c = await res.json();
    setConversations((prev) => [c, ...prev]);
    setActiveId(c.id);
  }

  async function send() {
    if (!input.trim() || sending) return;
    let convId = activeId;
    if (!convId) {
      const res = await fetch("/api/erp/ai/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: input.slice(0, 60) }),
      });
      if (!res.ok) { setError("Falha ao criar conversa"); return; }
      const c = await res.json();
      setConversations((prev) => [c, ...prev]);
      convId = c.id;
      setActiveId(convId);
    }
    setSending(true);
    setError(null);
    const content = input;
    setInput("");
    try {
      const res = await fetch(`/api/erp/ai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        setError(e.error || "Erro ao enviar mensagem.");
        return;
      }
      const data = await res.json();
      setFull((prev) => prev ? {
        ...prev,
        messages: [...prev.messages, data.userMessage, data.assistantMessage],
        actions: [...prev.actions, ...data.actions],
      } : prev);
    } catch (e) {
      setError(String(e));
    } finally {
      setSending(false);
    }
  }

  async function approve(id: string) {
    const res = await fetch(`/api/erp/ai/actions/${id}/approve`, { method: "POST" });
    const data = await res.json();
    setFull((prev) => prev ? {
      ...prev,
      actions: prev.actions.map((a) => a.id === id ? { ...a, ...data } : a),
    } : prev);
  }

  async function reject(id: string) {
    const res = await fetch(`/api/erp/ai/actions/${id}/reject`, { method: "POST" });
    const data = await res.json();
    setFull((prev) => prev ? {
      ...prev,
      actions: prev.actions.map((a) => a.id === id ? { ...a, ...data } : a),
    } : prev);
  }

  const activeActionsByMessage = full?.actions ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-700 dark:text-neutral-100 tracking-tight">
          Liba+ AI
        </h1>
        <p className="mt-1 text-sm text-slate-400 dark:text-neutral-500">
          Seu copiloto financeiro. Descreva o que precisa e aprove as ações sugeridas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-5" style={{ minHeight: "calc(100vh - 220px)" }}>
        {/* Conversation list */}
        <div className="card flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800">
            <button onClick={newConversation} className="btn-primary w-full text-sm">+ Nova conversa</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <p className="px-4 py-6 text-xs text-slate-400 dark:text-neutral-500 text-center">
                Nenhuma conversa ainda.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-neutral-800">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-neutral-900/60 transition ${activeId === c.id ? "bg-brand-50 dark:bg-brand-500/10" : ""}`}
                    >
                      <p className="text-sm font-medium text-slate-800 dark:text-neutral-100 truncate">{c.title}</p>
                      <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-0.5">
                        {new Date(c.updatedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* File upload (placeholder) */}
          <div className="px-4 py-3 border-t border-slate-100 dark:border-neutral-800">
            <div className="rounded-lg border border-dashed border-slate-200 dark:border-neutral-800 px-3 py-4 text-center">
              <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium">Anexar nota fiscal</p>
              <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-1">em breve</p>
            </div>
          </div>
        </div>

        {/* Active conversation */}
        <div className="card flex flex-col overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {!full && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                  <svg className="w-7 h-7 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 dark:text-neutral-400">
                  Inicie uma nova conversa para começar.
                </p>
                <p className="text-xs text-slate-400 dark:text-neutral-500 max-w-md">
                  Exemplos: <em>“cadastrar cliente Acme LTDA”</em>, <em>“lançar despesa de aluguel R$ 2.500 vencendo 10/06”</em>.
                </p>
              </div>
            )}
            {full?.messages.map((m, i) => {
              const isUser = m.role === "USER";
              // Find actions that came right after this assistant message
              const followingActions = !isUser
                ? activeActionsByMessage.filter((a) => {
                    const aTime = new Date(a.createdAt).getTime();
                    const mTime = new Date(m.createdAt).getTime();
                    const next = full.messages[i + 1];
                    const nextTime = next ? new Date(next.createdAt).getTime() : Infinity;
                    return aTime >= mTime - 1000 && aTime <= nextTime;
                  })
                : [];
              return (
                <div key={m.id}>
                  <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                        isUser
                          ? "bg-brand-500 text-white"
                          : "bg-slate-100 dark:bg-neutral-800 text-slate-800 dark:text-neutral-100"
                      }`}
                    >
                      {m.content}
                    </div>
                  </div>
                  {followingActions.length > 0 && (
                    <div className="mt-3 space-y-2 pl-2">
                      {followingActions.map((a) => (
                        <ActionCard key={a.id} action={a} onApprove={() => approve(a.id)} onReject={() => reject(a.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {error && (
              <div className="rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-300">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-slate-100 dark:border-neutral-800">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Descreva o que precisa fazer..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={sending}
              />
              <button type="submit" className="btn-primary" disabled={sending || !input.trim()}>
                {sending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionCard({ action, onApprove, onReject }: { action: Action; onApprove: () => void; onReject: () => void }) {
  const label = ACTION_LABELS[action.type] ?? action.type;
  const summary = (action.payload?._description as string) || formatPayload(action.type, action.payload);
  const link = TARGET_LINKS[action.type];

  return (
    <div className="rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-500">{label}</p>
          <p className="text-sm text-slate-800 dark:text-neutral-100 mt-1">{summary}</p>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full whitespace-nowrap ${
            action.status === "DRAFT"
              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
              : action.status === "EXECUTED"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
              : action.status === "REJECTED"
              ? "bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400"
              : "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400"
          }`}
        >
          {action.status}
        </span>
      </div>
      {action.status === "DRAFT" && (
        <div className="flex gap-2 mt-3">
          <button onClick={onApprove} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition">
            Aprovar
          </button>
          <button onClick={onReject} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition">
            Rejeitar
          </button>
        </div>
      )}
      {action.status === "EXECUTED" && link && (
        <a href={link} className="inline-block mt-2 text-xs text-brand-500 hover:text-brand-600 font-semibold">
          Ver registro criado →
        </a>
      )}
      {action.status === "FAILED" && action.errorMessage && (
        <p className="mt-2 text-xs text-rose-500">{action.errorMessage}</p>
      )}
    </div>
  );
}
