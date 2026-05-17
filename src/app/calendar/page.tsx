import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CalendarView from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await requireUser();

  const meetings = await prisma.meeting.findMany({
    where: { userId: user.id },
    include: { attendees: true },
    orderBy: { startAt: "asc" },
  }).catch(() => []);

  const serialized = meetings.map((m) => ({
    ...m,
    startAt: m.startAt.toISOString(),
    endAt: m.endAt.toISOString(),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  }));

  return <CalendarView initialMeetings={serialized} />;
}
