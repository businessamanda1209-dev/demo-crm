import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateICS } from "@/lib/ics";
import { getSiteUrl } from "@/lib/supabase/env";

export async function GET(_req: NextRequest, { params }: { params: { link: string } }) {
  const meeting = await prisma.meeting.findUnique({
    where: { meetingLink: params.link },
    include: { attendees: true },
  });
  if (!meeting) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const ics = generateICS(
    {
      ...meeting,
      isAllDay: meeting.isAllDay,
      timezone: meeting.timezone,
      attendees: meeting.attendees.map((a) => ({
        name: a.name,
        email: a.email,
        responseStatus: a.responseStatus,
      })),
    },
    "",
    getSiteUrl()
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reuniao-${meeting.meetingLink}.ics"`,
    },
  });
}
