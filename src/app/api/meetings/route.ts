import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const meetings = await prisma.meeting.findMany({
      where: { userId: user.id },
      include: { attendees: true },
      orderBy: { startAt: "asc" },
    });
    return NextResponse.json(meetings);
  } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const meeting = await prisma.meeting.create({
      data: {
        userId: user.id,
        title: body.title,
        description: body.description || null,
        startAt: new Date(body.startAt),
        endAt: new Date(body.endAt),
        status: body.status ?? "SCHEDULED",
        attendees: body.attendees?.length
          ? { create: body.attendees.map((a: { name: string; email?: string }) => ({ name: a.name, email: a.email || null })) }
          : undefined,
      },
      include: { attendees: true },
    });
    return NextResponse.json(meeting, { status: 201 });
  } catch { return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
