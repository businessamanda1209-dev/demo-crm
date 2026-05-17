import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { processMessage } from "@/lib/ai";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    const text = (body.content as string)?.trim();
    if (!text) return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });

    const conv = await prisma.aiConversation.findFirst({
      where: { id: params.id, userId: user.id },
    });
    if (!conv) return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });

    // Save user message
    const userMsg = await prisma.aiMessage.create({
      data: { conversationId: conv.id, role: "USER", content: text },
    });

    // Process via local parser
    const result = await processMessage(text);

    // Save assistant message
    const assistantMsg = await prisma.aiMessage.create({
      data: { conversationId: conv.id, role: "ASSISTANT", content: result.assistant },
    });

    // Save draft actions
    const actions = [] as any[];
    for (const a of result.actions) {
      const action = await prisma.aiDraftAction.create({
        data: {
          conversationId: conv.id,
          userId: user.id,
          type: a.type,
          status: "DRAFT",
          payload: { ...a.payload, _description: a.description },
        },
      });
      actions.push(action);
    }

    // Update conversation timestamp + title (first user message)
    await prisma.aiConversation.update({
      where: { id: conv.id },
      data: {
        updatedAt: new Date(),
        ...(conv.title === "Nova conversa" ? { title: text.slice(0, 60) } : {}),
      },
    });

    return NextResponse.json({ userMessage: userMsg, assistantMessage: assistantMsg, actions });
  } catch (e) {
    console.error("[ai messages POST]", e);
    return NextResponse.json({ error: "Falha ao processar" }, { status: 500 });
  }
}
