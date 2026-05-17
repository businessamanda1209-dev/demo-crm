import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();
    await prisma.meeting.updateMany({
      where: { id: params.id, userId: user.id },
      data: {
        title: body.title,
        description: body.description || null,
        startAt: body.startAt ? new Date(body.startAt) : undefined,
        endAt: body.endAt ? new Date(body.endAt) : undefined,
        status: body.status,
        timezone: body.timezone,
        isAllDay: body.isAllDay,
        location: body.location || null,
        color: body.color || null,
        repeatRule: body.repeatRule || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("PATCH /api/meetings/[id]:", e);
    return NextResponse.json({ error: "Erro ao atualizar reunião" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await prisma.meeting.deleteMany({ where: { id: params.id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/meetings/[id]:", e);
    return NextResponse.json({ error: "Erro ao excluir reunião" }, { status: 500 });
  }
}
