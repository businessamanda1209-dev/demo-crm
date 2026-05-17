import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { rowsToCSV, fmtDateBR, fmtAmountBR, csvResponseHeaders } from "@/lib/csv";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  OPEN: "Em aberto",
  SCHEDULED: "Agendado",
  PAID: "Pago",
  OVERDUE: "Vencido",
};

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payables = await prisma.payable.findMany({
      where: { userId: user.id },
      include: { party: true, category: true, costCenter: true, account: true },
      orderBy: { dueDate: "asc" },
    });

    const headers = [
      "Tipo",
      "Fornecedor",
      "CPF/CNPJ",
      "Descrição",
      "Valor",
      "Status",
      "Data de competência",
      "Vencimento",
      "Data de pagamento",
      "Categoria",
      "Centro de custo",
      "Conta financeira",
      "Forma de pagamento",
      "Código de referência",
      "Observações",
    ];
    const rows = payables.map((p) => [
      "Despesa",
      p.party?.tradeName || p.party?.legalName || "",
      p.party?.document || "",
      p.description,
      fmtAmountBR(p.amount),
      STATUS_LABELS[p.status] ?? p.status,
      fmtDateBR(p.competenceDate),
      fmtDateBR(p.dueDate),
      fmtDateBR(p.paidAt),
      p.category?.description || "",
      p.costCenter ? `${p.costCenter.code} — ${p.costCenter.name}` : "",
      p.account?.name || "",
      p.paymentMethod || "",
      p.referenceCode || "",
      p.notes || "",
    ]);

    const csv = rowsToCSV(headers, rows);
    return new NextResponse(csv, { headers: csvResponseHeaders("contas-a-pagar.csv") });
  } catch (e) {
    console.error("[export payables]", e);
    return NextResponse.json({ error: "Falha ao exportar" }, { status: 500 });
  }
}
