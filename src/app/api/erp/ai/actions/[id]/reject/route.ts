import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const action = await (prisma as any).aiDraftAction.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!action) return NextResponse.json({ error: "Ação não encontrada" }, { status: 404 });

    const updated = await (prisma as any).aiDraftAction.update({
      where: { id: action.id },
      data: { status: "REJECTED" },
    });
    return NextResponse.json(updated);
  } catch (e) {
    console.error("[ai action reject]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
