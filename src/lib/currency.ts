// Brazilian currency parsing: "1.234,56" or "1234.56" or "1234,56" -> 1234.56
export function parseBRL(input: string | number | null | undefined): number {
  if (typeof input === "number") return input;
  if (!input) return 0;
  const cleaned = String(input).replace(/\s|R\$/g, "").trim();
  if (!cleaned) return 0;
  // If it contains both . and , then . is thousand sep and , is decimal.
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const n = parseFloat(cleaned.replace(/\./g, "").replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  }
  // Only comma -> decimal sep
  if (cleaned.includes(",")) {
    const n = parseFloat(cleaned.replace(",", "."));
    return Number.isNaN(n) ? 0 : n;
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? 0 : n;
}

export function formatBRLInput(value: number): string {
  if (!value && value !== 0) return "";
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
