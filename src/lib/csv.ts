// CSV helpers — uses semicolons + UTF-8 BOM so Excel/Sheets open cleanly with pt-BR locale.

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function rowsToCSV(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(csvEscape).join(";"),
    ...rows.map((r) => r.map(csvEscape).join(";")),
  ];
  return "﻿" + lines.join("\r\n");
}

export function fmtDateBR(d: Date | string | null | undefined): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

export function fmtAmountBR(n: unknown): string {
  const v = typeof n === "number" ? n : Number(n ?? 0);
  if (Number.isNaN(v)) return "0,00";
  return v.toFixed(2).replace(".", ",");
}

export function csvResponseHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
