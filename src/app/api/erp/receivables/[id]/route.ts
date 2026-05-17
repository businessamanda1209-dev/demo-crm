import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    if ("categoryId" in body && !body.categoryId) {
      return NextResponse.json({ error: "Categoria é obrigatória." }, { status: 400 });
    }
    if ("costCenterId" in body && !body.costCenterId) {
      return NextResponse.json({ error: "Centro de custo é obrigatório." }, { status: 400 });
    }
    await prisma.receivable.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        partyId: body.partyId || null,
        categoryId: body.categoryId,
        costCenterId: body.costCenterId,
        accountId: body.accountId || null,
        type: body.type,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        competenceDate: body.competenceDate ? new Date(body.competenceDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
        receivingMethod: body.receivingMethod || null,
        referenceCode: body.referenceCode || null,
        status: body.status,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[receivables PATCH]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.receivable.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[receivables DELETE]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
