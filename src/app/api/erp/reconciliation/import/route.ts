import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { parseStatement } from "@/lib/bank-parser";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const filename = (body.filename || "extrato").toString();
    const content = (body.content || "").toString();
    const accountId = body.accountId || null;
    if (!content.trim()) {
      return NextResponse.json({ error: "Arquivo vazio." }, { status: 400 });
    }

    const parsed = parseStatement(filename, content);
    if (parsed.length === 0) {
      return NextResponse.json({ error: "Nenhuma transação encontrada no arquivo." }, { status: 400 });
    }

    const batch = await prisma.bankImportBatch.create({
      data: { userId: user.id, accountId, filename },
    });

    let created = 0;
    let skipped = 0;
    for (const t of parsed) {
      try {
        await prisma.bankTransaction.create({
          data: {
            batchId: batch.id,
            userId: user.id,
            accountId,
            date: t.date,
            amount: t.amount,
            description: t.description,
            type: t.type,
            externalId: t.externalId,
          },
        });
        created++;
      } catch {
        // unique constraint (batchId+externalId) — skip duplicate
        skipped++;
      }
    }

    return NextResponse.json({ batchId: batch.id, created, skipped, total: parsed.length });
  } catch (e) {
    console.error("[reconciliation import]", e);
    return NextResponse.json({ error: "Falha ao importar" }, { status: 500 });
  }
}
