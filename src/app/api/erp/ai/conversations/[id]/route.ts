import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const conv = await prisma.aiConversation.findFirst({
      where: { id: params.id, userId: user.id },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        actions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!conv) return NextResponse.json({ error: "Não encontrada" }, { status: 404 });
    return NextResponse.json(conv);
  } catch (e) {
    console.error("[ai conversation GET]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.aiConversation.deleteMany({
      where: { id: params.id, userId: user.id },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[ai conversation DELETE]", e);
    return NextResponse.json({ error: "Falha" }, { status: 500 });
  }
}
