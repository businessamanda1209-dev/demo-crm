import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;
    const where: Record<string, unknown> = { userId: user.id };
    if (accountId) where.accountId = accountId;
    const txns = await prisma.bankTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: 200,
    });

    // Build suggestion matches for each unreconciled transaction
    const ids = txns.filter((t) => !t.reconciled).map((t) => t.id);
    const payables = await prisma.payable.findMany({
      where: { userId: user.id, status: { not: "PAID" } },
      select: { id: true, description: true, amount: true, dueDate: true, party: { select: { tradeName: true, legalName: true } } },
      take: 500,
    });
    const receivables = await prisma.receivable.findMany({
      where: { userId: user.id, status: { not: "RECEIVED" } },
      select: { id: true, description: true, amount: true, dueDate: true, party: { select: { tradeName: true, legalName: true } } },
      take: 500,
    });

    const out = txns.map((t) => {
      const amt = Number(t.amount);
      const window = 5 * 24 * 3600 * 1000; // 5-day window
      const target = t.type === "DEBIT" ? payables : receivables;
      const matches = target
        .filter((x) => Math.abs(Number(x.amount) - amt) < 0.01 && Math.abs(x.dueDate.getTime() - t.date.getTime()) <= window)
        .slice(0, 5)
        .map((x) => ({
          id: x.id,
          kind: t.type === "DEBIT" ? ("payable" as const) : ("receivable" as const),
          description: x.description,
          amount: Number(x.amount),
          dueDate: x.dueDate.toISOString(),
          party: x.party?.tradeName || x.party?.legalName || null,
        }));
      return {
        id: t.id,
        date: t.date.toISOString(),
        description: t.description,
        amount: amt,
        type: t.type,
        reconciled: t.reconciled,
        payableId: t.payableId,
        receivableId: t.receivableId,
        suggestions: ids.includes(t.id) ? matches : [],
      };
    });

    return NextResponse.json(out);
  } catch (e) {
    console.error("[reconciliation list]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
