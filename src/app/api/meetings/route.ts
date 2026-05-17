import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const meetings = await prisma.meeting.findMany({
      where: { userId: user.id },
      include: { attendees: true },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json(meetings);
  } catch (e) {
    console.error("GET /api/meetings:", e);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await req.json();

    if (!body.title?.trim()) return NextResponse.json({ error: "Título obrigatório" }, { status: 400 });
    if (!body.startAt) return NextResponse.json({ error: "Data de início obrigatória" }, { status: 400 });
    if (!body.endAt) return NextResponse.json({ error: "Data de término obrigatória" }, { status: 400 });

    const startAt = new Date(body.startAt);
    const endAt = new Date(body.endAt);
    if (isNaN(startAt.getTime())) return NextResponse.json({ error: "Data de início inválida" }, { status: 400 });
    if (isNaN(endAt.getTime())) return NextResponse.json({ error: "Data de término inválida" }, { status: 400 });

    const meeting = await prisma.meeting.create({
      data: {
        userId: user.id,
        title: body.title.trim(),
        description: body.description || null,
        startAt,
        endAt,
        status: body.status ?? "SCHEDULED",
        timezone: body.timezone ?? "America/Sao_Paulo",
        isAllDay: body.isAllDay ?? false,
        location: body.location || null,
        color: body.color || null,
        repeatRule: body.repeatRule || null,
        attendees: body.attendees?.length
          ? {
              create: body.attendees.map((a: { name: string; email?: string; canInviteOthers?: boolean; canSeeGuestList?: boolean }) => ({
                name: a.name || a.email || "Convidado",
                email: a.email || null,
                canInviteOthers: a.canInviteOthers ?? false,
                canSeeGuestList: a.canSeeGuestList ?? true,
              })),
            }
          : undefined,
      },
      include: { attendees: true },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch (e) {
    console.error("POST /api/meetings:", e);
    return NextResponse.json({ error: "Erro ao criar reunião" }, { status: 500 });
  }
}
