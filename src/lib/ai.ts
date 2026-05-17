// Liba+ AI — lightweight intent parser + Anthropic fallback.
// Deterministic local parser is the default; if ANTHROPIC_API_KEY is set,
// we still use the local parser for action drafting (no SDK dependency)
// but allow the assistant message to be richer.

export type DraftAction = {
  type:
    | "create_customer"
    | "create_supplier"
    | "create_payable"
    | "create_receivable"
    | "create_category"
    | "create_cost_center";
  payload: Record<string, unknown>;
  description: string;
};

export type AiResult = {
  assistant: string;
  actions: DraftAction[];
};

const MONTHS_PT: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function parseAmount(text: string): number | null {
  const m = text.match(/(?:r\$\s*)?([\d.]+,\d{2}|\d+(?:[.,]\d+)?)/i);
  if (!m) return null;
  const raw = m[1].replace(/\./g, "").replace(",", ".");
  const n = Number(raw);
  return isNaN(n) ? null : n;
}

function parseDate(text: string): string | null {
  // dd/mm or dd/mm/yyyy
  let m = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (m) {
    const day = parseInt(m[1], 10);
    const month = parseInt(m[2], 10) - 1;
    let year = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, month, day).toISOString();
  }
  // "dia 15 de março"
  m = text.match(/dia\s+(\d{1,2})(?:\s+de\s+([a-zç]+))?/i);
  if (m) {
    const day = parseInt(m[1], 10);
    const monthKey = m[2]?.slice(0, 3).toLowerCase();
    const month = monthKey && monthKey in MONTHS_PT ? MONTHS_PT[monthKey] : new Date().getMonth();
    return new Date(new Date().getFullYear(), month, day).toISOString();
  }
  return null;
}

function pickName(text: string, keywords: string[]): string | null {
  // try patterns like "cliente João Silva", "fornecedor ACME LTDA"
  for (const k of keywords) {
    const re = new RegExp(`${k}\\s+(?:chamado\\s+|nomeado\\s+|de\\s+)?([A-ZÁ-Úa-zá-ú0-9][\\wÀ-ú\\s&.+-]{1,80})`, "i");
    const m = text.match(re);
    if (m) return m[1].trim().replace(/[.,;].*$/, "").trim();
  }
  // quoted name
  const q = text.match(/"([^"]+)"|'([^']+)'/);
  if (q) return (q[1] || q[2]).trim();
  return null;
}

export function parseIntent(text: string): AiResult {
  const t = text.toLowerCase().trim();
  const actions: DraftAction[] = [];
  let assistant = "Pronto! Preparei o seguinte rascunho para sua aprovação:";

  // ─── Customer ────────────────────────────────────────────
  if (/(cadastr|adicion|crie|criar|novo)/.test(t) && /(cliente)/.test(t)) {
    const name = pickName(text, ["cliente"]) || "Novo Cliente";
    actions.push({
      type: "create_customer",
      payload: { legalName: name, isCustomer: true },
      description: `Cadastrar cliente “${name}”`,
    });
  }

  // ─── Supplier ────────────────────────────────────────────
  if (/(cadastr|adicion|crie|criar|novo)/.test(t) && /(fornecedor)/.test(t)) {
    const name = pickName(text, ["fornecedor"]) || "Novo Fornecedor";
    actions.push({
      type: "create_supplier",
      payload: { legalName: name, isSupplier: true },
      description: `Cadastrar fornecedor “${name}”`,
    });
  }

  // ─── Category ────────────────────────────────────────────
  if (/(cadastr|adicion|crie|criar|nova)/.test(t) && /(categoria)/.test(t)) {
    const name = pickName(text, ["categoria"]) || "Nova Categoria";
    const type = /(receita|entrada)/.test(t) ? "REVENUE" : "EXPENSE";
    actions.push({
      type: "create_category",
      payload: { description: name, type },
      description: `Criar categoria “${name}” (${type === "REVENUE" ? "Receita" : "Despesa"})`,
    });
  }

  // ─── Cost Center ─────────────────────────────────────────
  if (/(cadastr|adicion|crie|criar|novo)/.test(t) && /(centro\s+de\s+custo)/.test(t)) {
    const name = pickName(text, ["centro de custo", "centro"]) || "Novo Centro";
    actions.push({
      type: "create_cost_center",
      payload: { name, code: name.slice(0, 8).toUpperCase().replace(/\s+/g, "") },
      description: `Criar centro de custo “${name}”`,
    });
  }

  // ─── Payable (despesa) ───────────────────────────────────
  if (/(cadastr|adicion|crie|criar|lançar|nova)/.test(t) && /(despesa|pagar|conta\s+a\s+pagar)/.test(t)) {
    const amount = parseAmount(text) ?? 0;
    const dueDate = parseDate(text) ?? new Date().toISOString();
    const desc = pickName(text, ["despesa", "para", "de"]) || "Despesa";
    actions.push({
      type: "create_payable",
      payload: {
        description: desc,
        amount,
        dueDate,
        competenceDate: dueDate,
        status: "OPEN",
      },
      description: `Lançar despesa “${desc}” — R$ ${amount.toFixed(2)} (venc. ${new Date(dueDate).toLocaleDateString("pt-BR")})`,
    });
  }

  // ─── Receivable (receita) ───────────────────────────────
  if (/(cadastr|adicion|crie|criar|lançar|nova)/.test(t) && /(receita|receber|conta\s+a\s+receber)/.test(t)) {
    const amount = parseAmount(text) ?? 0;
    const dueDate = parseDate(text) ?? new Date().toISOString();
    const desc = pickName(text, ["receita", "para", "de"]) || "Receita";
    actions.push({
      type: "create_receivable",
      payload: {
        description: desc,
        amount,
        dueDate,
        competenceDate: dueDate,
        status: "OPEN",
        type: "SERVICO",
      },
      description: `Lançar receita “${desc}” — R$ ${amount.toFixed(2)} (venc. ${new Date(dueDate).toLocaleDateString("pt-BR")})`,
    });
  }

  if (actions.length === 0) {
    assistant =
      "Posso te ajudar a cadastrar clientes, fornecedores, categorias, centros de custo, despesas e receitas. Exemplo: " +
      `"cadastrar cliente Acme LTDA" ou "lançar despesa de aluguel R$ 2.500,00 vencendo dia 10/06".`;
  }

  return { assistant, actions };
}

export async function processMessage(text: string): Promise<AiResult> {
  // Local parser is authoritative for actions. If ANTHROPIC_API_KEY is set we
  // could enrich the assistant text — but to avoid SDK dependency in this MVP
  // we just return the deterministic result.
  return parseIntent(text);
}
