import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { csvEscape, fmtDateBR, fmtAmountBR, csvResponseHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

function sectionToCSV(title: string, headers: string[], rows: unknown[][]): string {
  const lines: string[] = [];
  lines.push(`=== ${title} ===`);
  lines.push(headers.map(csvEscape).join(";"));
  for (const r of rows) lines.push(r.map(csvEscape).join(";"));
  lines.push("");
  return lines.join("\r\n");
}

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const yearStr = searchParams.get("year");
    const monthStr = searchParams.get("month");
    const now = new Date();
    const year = yearStr ? Number(yearStr) : now.getFullYear();
    const month = monthStr ? Number(monthStr) - 1 : now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);

    const [payables, receivables, customers, suppliers, categories, costCenters, accounts, bankTxns] = await Promise.all([
      prisma.payable.findMany({
        where: { userId: user.id, OR: [{ competenceDate: { gte: start, lt: end } }, { dueDate: { gte: start, lt: end } }] },
        include: { party: true, category: true, costCenter: true, account: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.receivable.findMany({
        where: { userId: user.id, OR: [{ competenceDate: { gte: start, lt: end } }, { dueDate: { gte: start, lt: end } }] },
        include: { party: true, category: true, costCenter: true, account: true },
        orderBy: { dueDate: "asc" },
      }),
      prisma.party.findMany({ where: { userId: user.id, isCustomer: true }, orderBy: { legalName: "asc" } }),
      prisma.party.findMany({ where: { userId: user.id, isSupplier: true }, orderBy: { legalName: "asc" } }),
      prisma.financialCategory.findMany({ where: { userId: user.id }, orderBy: { description: "asc" } }),
      prisma.costCenter.findMany({ where: { userId: user.id }, orderBy: { code: "asc" } }),
      prisma.financialAccount.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
      prisma.bankTransaction.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, orderBy: { date: "asc" } }).catch(() => [] as any[]),
    ]);

    const sections: string[] = [];

    sections.push(`Fechamento contábil - Período: ${String(month + 1).padStart(2, "0")}/${year}`);
    sections.push("Pacote de apoio contábil - Não substitui obrigações oficiais como SPED/ECD/ECF");
    sections.push("");

    sections.push(
      sectionToCSV(
        "CONTAS A PAGAR",
        ["Fornecedor", "CPF/CNPJ", "Descrição", "Valor", "Status", "Competência", "Vencimento", "Pago em", "Categoria", "Centro de custo", "Conta", "Forma de pagamento", "Observações"],
        payables.map((p) => [
          p.party?.tradeName || p.party?.legalName || "",
          p.party?.document || "",
          p.description,
          fmtAmountBR(p.amount),
          p.status,
          fmtDateBR(p.competenceDate),
          fmtDateBR(p.dueDate),
          fmtDateBR(p.paidAt),
          p.category?.description || "",
          p.costCenter ? `${p.costCenter.code} — ${p.costCenter.name}` : "",
          p.account?.name || "",
          p.paymentMethod || "",
          p.notes || "",
        ]),
      ),
    );

    sections.push(
      sectionToCSV(
        "CONTAS A RECEBER",
        ["Cliente", "CPF/CNPJ", "Descrição", "Valor", "Status", "Competência", "Vencimento", "Recebido em", "Categoria", "Centro de custo", "Conta", "Forma de recebimento", "Observações"],
        receivables.map((r) => [
          r.party?.tradeName || r.party?.legalName || "",
          r.party?.document || "",
          r.description,
          fmtAmountBR(r.amount),
          r.status,
          fmtDateBR(r.competenceDate),
          fmtDateBR(r.dueDate),
          fmtDateBR(r.receivedAt),
          r.category?.description || "",
          r.costCenter ? `${r.costCenter.code} — ${r.costCenter.name}` : "",
          r.account?.name || "",
          r.receivingMethod || "",
          r.notes || "",
        ]),
      ),
    );

    sections.push(
      sectionToCSV(
        "CLIENTES",
        ["Razão social", "Nome fantasia", "CPF/CNPJ", "E-mail", "Telefone", "Cidade", "UF"],
        customers.map((c) => [c.legalName, c.tradeName || "", c.document || "", c.email || "", c.mobile || c.phone || "", c.addressCity || "", c.addressState || ""]),
      ),
    );

    sections.push(
      sectionToCSV(
        "FORNECEDORES",
        ["Razão social", "Nome fantasia", "CPF/CNPJ", "E-mail", "Telefone", "Cidade", "UF"],
        suppliers.map((s) => [s.legalName, s.tradeName || "", s.document || "", s.email || "", s.mobile || s.phone || "", s.addressCity || "", s.addressState || ""]),
      ),
    );

    sections.push(
      sectionToCSV(
        "CATEGORIAS",
        ["Tipo", "Descrição", "Ativa"],
        categories.map((c) => [c.type, c.description, c.active ? "Sim" : "Não"]),
      ),
    );

    sections.push(
      sectionToCSV(
        "CENTROS DE CUSTO",
        ["Código", "Nome", "Ativo"],
        costCenters.map((c) => [c.code, c.name, c.active ? "Sim" : "Não"]),
      ),
    );

    sections.push(
      sectionToCSV(
        "CONTAS FINANCEIRAS",
        ["Nome", "Tipo", "Banco", "Agência", "Conta", "Saldo"],
        accounts.map((a) => [a.name, a.type, a.bankName || "", a.agency || "", a.accountNumber || "", fmtAmountBR(a.balance)]),
      ),
    );

    sections.push(
      sectionToCSV(
        "TRANSAÇÕES BANCÁRIAS",
        ["Data", "Descrição", "Tipo", "Valor", "Conciliada"],
        bankTxns.map((t: any) => [fmtDateBR(t.date), t.description, t.type, fmtAmountBR(t.amount), t.reconciled ? "Sim" : "Não"]),
      ),
    );

    const csv = "﻿" + sections.join("\r\n");
    const filename = `fechamento-contabil-${year}-${String(month + 1).padStart(2, "0")}.csv`;
    return new NextResponse(csv, { headers: csvResponseHeaders(filename) });
  } catch (e) {
    console.error("[accounting-closing export]", e);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
