import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Public endpoint — no auth required. Returns minimal meeting info for the
// invite landing page at /meet/[meetingLink].
export async function GET(_req: NextRequest, { params }: { params: { link: string } }) {
  try {
    const meeting = await prisma.meeting.findUnique({
      where: { meetingLink: params.link },
      select: {
        id: true,
        title: true,
        startAt: true,
        endAt: true,
        isAllDay: true,
        location: true,
        meetingLink: true,
        timezone: true,
      },
    });
    if (!meeting) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    return NextResponse.json({ ...meeting, organizer: "Liba+" });
  } catch (e) {
    console.error("[meetings public GET]", e);
    return NextResponse.json({ error: "Falha ao buscar reunião" }, { status: 500 });
  }
}
