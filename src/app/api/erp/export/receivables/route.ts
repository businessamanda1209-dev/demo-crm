import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { rowsToCSV, fmtDateBR, fmtAmountBR, csvResponseHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Em aberto",
  SCHEDULED: "Agendado",
  RECEIVED: "Recebido",
  OVERDUE: "Vencido",
};

const TYPE_LABELS: Record<string, string> = {
  SERVICO: "Serviço",
  PRODUTO: "Produto",
  DIVERSA: "Diversa",
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const receivables = await prisma.receivable.findMany({
      where: { userId: user.id },
      include: { party: true, category: true, costCenter: true, account: true },
      orderBy: { dueDate: "asc" },
    });

    const headers = [
      "Tipo",
      "Subtipo",
      "Cliente",
      "CPF/CNPJ",
      "Descrição",
      "Valor",
      "Status",
      "Data de competência",
      "Vencimento",
      "Data de recebimento",
      "Categoria",
      "Centro de custo",
      "Conta financeira",
      "Forma de recebimento",
      "Código de referência",
      "Observações",
    ];
    const rows = receivables.map((r) => [
      "Receita",
      TYPE_LABELS[r.type] ?? r.type,
      r.party?.tradeName || r.party?.legalName || "",
      r.party?.document || "",
      r.description,
      fmtAmountBR(r.amount),
      STATUS_LABELS[r.status] ?? r.status,
      fmtDateBR(r.competenceDate),
      fmtDateBR(r.dueDate),
      fmtDateBR(r.receivedAt),
      r.category?.description || "",
      r.costCenter ? `${r.costCenter.code} — ${r.costCenter.name}` : "",
      r.account?.name || "",
      r.receivingMethod || "",
      r.referenceCode || "",
      r.notes || "",
    ]);

    const csv = rowsToCSV(headers, rows);
    return new NextResponse(csv, { headers: csvResponseHeaders("contas-a-receber.csv") });
  } catch (e) {
    console.error("[export receivables]", e);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
