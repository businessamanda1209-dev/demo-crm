// Lightweight parsers for OFX and CSV bank statement files.
// Returns normalized transaction records ready to insert.

export type ParsedTxn = {
  externalId: string | null;
  date: Date;
  amount: number;
  description: string;
  type: "CREDIT" | "DEBIT";
};

function parseAmountString(s: string): number | null {
  if (!s) return null;
  const cleaned = s.trim().replace(/\s+/g, "").replace(/[R$]/gi, "");
  // BR style: 1.234,56  or US: 1,234.56  or plain: -100.50
  let normalized = cleaned;
  if (/,\d{1,2}$/.test(cleaned) && /\./.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/,\d{1,2}$/.test(cleaned)) {
    normalized = cleaned.replace(",", ".");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseDateString(s: string): Date | null {
  if (!s) return null;
  const t = s.trim();
  // YYYYMMDD or YYYYMMDDHHMMSS (OFX)
  let m = t.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // DD/MM/YYYY or DD-MM-YYYY
  m = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let y = Number(m[3]);
    if (y < 100) y += 2000;
    const d = new Date(y, Number(m[2]) - 1, Number(m[1]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  // YYYY-MM-DD
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return d;
  }
  const generic = new Date(t);
  return Number.isNaN(generic.getTime()) ? null : generic;
}

export function parseOFX(content: string): ParsedTxn[] {
  const txns: ParsedTxn[] = [];
  const blockRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  // Some OFX files omit closing tags — handle that too:
  const altBlockRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/BANKTRANLIST>|$)/gi;
  const matches: RegExpMatchArray[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(content)) !== null) matches.push(m);
  if (matches.length === 0) {
    while ((m = altBlockRegex.exec(content)) !== null) matches.push(m);
  }

  for (const match of matches) {
    const block = match[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i").exec(block);
      return r ? r[1].trim() : "";
    };
    const fitid = get("FITID");
    const dtposted = get("DTPOSTED");
    const trnamt = get("TRNAMT");
    const memo = get("MEMO") || get("NAME") || "Transação";
    const date = parseDateString(dtposted);
    const amount = parseAmountString(trnamt);
    if (!date || amount === null) continue;
    txns.push({
      externalId: fitid || null,
      date,
      amount: Math.abs(amount),
      description: memo,
      type: amount < 0 ? "DEBIT" : "CREDIT",
    });
  }
  return txns;
}

export function parseCSV(content: string): ParsedTxn[] {
  const lines = content.replace(/\r/g, "").split("\n").filter((l) => l.trim());
  if (lines.length === 0) return [];

  // Detect delimiter
  const delim = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const splitLine = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') { inQuotes = !inQuotes; continue; }
      if (c === delim && !inQuotes) { out.push(cur); cur = ""; continue; }
      cur += c;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  };

  const header = splitLine(lines[0]).map((h) => h.toLowerCase());
  const findIdx = (...candidates: string[]) =>
    header.findIndex((h) => candidates.some((c) => h.includes(c)));

  let dateIdx = findIdx("data", "date");
  let descIdx = findIdx("descri", "histor", "memo", "description");
  let amountIdx = findIdx("valor", "amount", "montante");
  let creditIdx = findIdx("credit", "entrada");
  let debitIdx = findIdx("debit", "saida", "saída");
  let idIdx = findIdx("id", "fitid", "identifica");

  const hasHeader = dateIdx >= 0 || amountIdx >= 0 || (creditIdx >= 0 && debitIdx >= 0);
  const startLine = hasHeader ? 1 : 0;
  if (!hasHeader) {
    // Fallback: assume columns date,desc,amount
    dateIdx = 0; descIdx = 1; amountIdx = 2;
  }

  const txns: ParsedTxn[] = [];
  for (let i = startLine; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    const date = parseDateString(cols[dateIdx] ?? "");
    if (!date) continue;
    let amount: number | null = null;
    let type: "CREDIT" | "DEBIT" = "CREDIT";
    if (amountIdx >= 0) {
      amount = parseAmountString(cols[amountIdx] ?? "");
      if (amount === null) continue;
      type = amount < 0 ? "DEBIT" : "CREDIT";
      amount = Math.abs(amount);
    } else {
      const credit = parseAmountString(cols[creditIdx] ?? "");
      const debit = parseAmountString(cols[debitIdx] ?? "");
      if (credit && credit !== 0) { amount = Math.abs(credit); type = "CREDIT"; }
      else if (debit && debit !== 0) { amount = Math.abs(debit); type = "DEBIT"; }
      else continue;
    }
    const description = (descIdx >= 0 ? cols[descIdx] : "") || "Transação";
    const externalId = idIdx >= 0 ? (cols[idIdx] || null) : null;
    txns.push({ externalId, date, amount, description, type });
  }
  return txns;
}

export function parseStatement(filename: string, content: string): ParsedTxn[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ofx") || /<OFX/i.test(content)) return parseOFX(content);
  return parseCSV(content);
}
