import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const list = await prisma.aiConversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error("[ai conversations GET]", e);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json().catch(() => ({}));
    const title = (body.title as string)?.trim() || "Nova conversa";
    const conv = await prisma.aiConversation.create({
      data: { userId: user.id, title },
    });
    return NextResponse.json(conv, { status: 201 });
  } catch (e) {
    console.error("[ai conversations POST]", e);
    return NextResponse.json({ error: "Falha ao criar conversa" }, { status: 500 });
  }
}
