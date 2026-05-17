import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const { kind, targetId } = body as { kind?: "payable" | "receivable"; targetId?: string };
    if (!kind || !targetId) {
      return NextResponse.json({ error: "kind e targetId são obrigatórios." }, { status: 400 });
    }

    const txn = await prisma.bankTransaction.findFirst({ where: { id: params.id, userId: user.id } });
    if (!txn) return NextResponse.json({ error: "Transação não encontrada" }, { status: 404 });

    if (kind === "payable") {
      const target = await prisma.payable.findFirst({ where: { id: targetId, userId: user.id } });
      if (!target) return NextResponse.json({ error: "Conta a pagar não encontrada" }, { status: 404 });
      await prisma.payable.update({
        where: { id: target.id },
        data: { status: "PAID", paidAt: txn.date },
      });
      await prisma.bankTransaction.update({
        where: { id: txn.id },
        data: { reconciled: true, payableId: target.id, receivableId: null },
      });
    } else {
      const target = await prisma.receivable.findFirst({ where: { id: targetId, userId: user.id } });
      if (!target) return NextResponse.json({ error: "Conta a receber não encontrada" }, { status: 404 });
      await prisma.receivable.update({
        where: { id: target.id },
        data: { status: "RECEIVED", receivedAt: txn.date },
      });
      await prisma.bankTransaction.update({
        where: { id: txn.id },
        data: { reconciled: true, receivableId: target.id, payableId: null },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[reconcile]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
