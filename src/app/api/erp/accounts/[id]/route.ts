import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const account = await prisma.financialAccount.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        name: body.name,
        type: body.type,
        bankName: body.bankName || null,
        agency: body.agency || null,
        accountNumber: body.accountNumber || null,
        holderType: body.holderType,
        canReceive: body.canReceive,
        canPay: body.canPay,
        balance: body.balance !== undefined ? parseFloat(body.balance) : undefined,
        active: body.active,
      },
    });
    if (account.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[accounts PATCH]", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.financialAccount.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[accounts DELETE]", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
