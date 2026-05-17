import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    let thread = await prisma.chatThread.findUnique({
      where: { userId: user.id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          userId: user.id,
          subject: "Atendimento financeiro",
          status: "OPEN",
          messages: {
            create: {
              senderType: "SYSTEM",
              content: "Bem-vindo ao suporte financeiro Liba+. Como podemos ajudar?",
            },
          },
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }
    return NextResponse.json({ threadId: thread.id, messages: thread.messages });
  } catch (e) {
    console.error("[chat GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { content } = await req.json();
    if (!content?.trim()) return NextResponse.json({ error: "Empty" }, { status: 400 });

    let thread = await prisma.chatThread.findUnique({ where: { userId: user.id } });
    if (!thread) {
      thread = await prisma.chatThread.create({
        data: { userId: user.id, subject: "Atendimento financeiro", status: "OPEN" },
      });
    }

    await prisma.chatMessage.create({
      data: { threadId: thread.id, senderType: "CLIENT", content: content.trim() },
    });

    const messages = await prisma.chatMessage.findMany({
      where: { threadId: thread.id },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ threadId: thread.id, messages });
  } catch (e) {
    console.error("[chat POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
