import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const txn = await prisma.bankTransaction.findFirst({ where: { id: params.id, userId: user.id } });
    if (!txn) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });
    await prisma.bankTransaction.update({
      where: { id: txn.id },
      data: { reconciled: false, payableId: null, receivableId: null },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[unmatch]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
