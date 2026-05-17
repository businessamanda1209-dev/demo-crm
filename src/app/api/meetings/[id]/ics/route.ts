import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { generateICS } from "@/lib/ics";
import { getSiteUrl } from "@/lib/supabase/env";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const meeting = await prisma.meeting.findFirst({
    where: { id: params.id, userId: user.id },
    include: { attendees: true },
  });
  if (!meeting) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // TODO: integrate with an email provider (Resend, SendGrid, etc.) to send
  // the ICS to all attendees automatically when a meeting is created.

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
    user.email ?? "",
    getSiteUrl()
  );

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reuniao-${meeting.id}.ics"`,
    },
  });
}
