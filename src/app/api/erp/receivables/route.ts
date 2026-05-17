import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const receivables = await prisma.receivable.findMany({
      where: { userId: user.id },
      include: {
        party: { select: { id: true, legalName: true, tradeName: true } },
        category: { select: { id: true, description: true } },
        account: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(receivables);
  } catch (e) {
    console.error("[receivables GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.categoryId) {
      return NextResponse.json({ error: "Categoria é obrigatória." }, { status: 400 });
    }
    if (!body.costCenterId) {
      return NextResponse.json({ error: "Centro de custo é obrigatório." }, { status: 400 });
    }
    const [cat, cc] = await Promise.all([
      prisma.financialCategory.findFirst({ where: { id: body.categoryId, userId: user.id } }),
      prisma.costCenter.findFirst({ where: { id: body.costCenterId, userId: user.id } }),
    ]);
    if (!cat) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });
    if (!cc) return NextResponse.json({ error: "Centro de custo inválido." }, { status: 400 });
    const receivable = await prisma.receivable.create({
      data: {
        userId: user.id,
        partyId: body.partyId || null,
        categoryId: body.categoryId,
        costCenterId: body.costCenterId,
        accountId: body.accountId || null,
        type: body.type ?? "SERVICO",
        description: body.description,
        amount: parseFloat(body.amount),
        competenceDate: new Date(body.competenceDate),
        dueDate: new Date(body.dueDate),
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
        receivingMethod: body.receivingMethod || null,
        recurrence: body.recurrence || null,
        referenceCode: body.referenceCode || null,
        notes: body.notes || null,
        status: body.status ?? "OPEN",
      },
      include: {
        party: { select: { id: true, legalName: true, tradeName: true } },
        category: { select: { id: true, description: true } },
        account: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(receivable, { status: 201 });
  } catch (e) {
    console.error("[receivables POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
