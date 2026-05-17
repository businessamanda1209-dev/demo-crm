import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    const body = await req.json();
    await prisma.receivable.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        partyId: body.partyId || null,
        categoryId: body.categoryId || null,
        costCenterId: body.costCenterId || null,
        accountId: body.accountId || null,
        type: body.type,
        description: body.description,
        amount: body.amount !== undefined ? parseFloat(body.amount) : undefined,
        competenceDate: body.competenceDate ? new Date(body.competenceDate) : undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        receivedAt: body.receivedAt ? new Date(body.receivedAt) : null,
        receivingMethod: body.receivingMethod || null,
        status: body.status,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireUser();
    await prisma.receivable.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
