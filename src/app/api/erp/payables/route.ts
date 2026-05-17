import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const payables = await prisma.payable.findMany({
      where: { userId: user.id },
      include: { party: { select: { id: true, legalName: true, tradeName: true } }, category: { select: { id: true, description: true } }, account: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    });
    return NextResponse.json(payables);
  } catch (e) {
    console.error("[payables GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const payable = await prisma.payable.create({
      data: {
        userId: user.id,
        partyId: body.partyId || null,
        categoryId: body.categoryId || null,
        costCenterId: body.costCenterId || null,
        accountId: body.accountId || null,
        description: body.description,
        amount: parseFloat(body.amount),
        competenceDate: new Date(body.competenceDate),
        dueDate: new Date(body.dueDate),
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        paymentMethod: body.paymentMethod || null,
        recurrence: body.recurrence || null,
        notes: body.notes || null,
        status: body.status ?? "OPEN",
      },
      include: { party: { select: { id: true, legalName: true, tradeName: true } }, category: { select: { id: true, description: true } }, account: { select: { id: true, name: true } } },
    });
    return NextResponse.json(payable, { status: 201 });
  } catch (e) {
    console.error("[payables POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
