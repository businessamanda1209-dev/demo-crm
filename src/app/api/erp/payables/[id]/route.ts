import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await prisma.payable.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        partyId: body.partyId || null,
        categoryId: body.categoryId || null,
        costCenterId: body.costCenterId || null,
        accountId: body.accountId || null,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        competenceDate: body.competenceDate ? new Date(body.competenceDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        paymentMethod: body.paymentMethod || null,
        status: body.status,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[payables PATCH]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.payable.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[payables DELETE]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
