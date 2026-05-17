function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toICSDate(date: Date): string {
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

function escapeICS(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** Fold long ICS lines at 75 octets per RFC 5545. */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  chunks.push(line.slice(0, 75));
  let i = 75;
  while (i < line.length) {
    chunks.push(" " + line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n");
}

type ICSMeeting = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  location: string | null;
  meetingLink: string;
  timezone: string;
  attendees: { name: string; email: string | null; responseStatus: string }[];
};

export function generateICS(meeting: ICSMeeting, organizerEmail: string, siteUrl = "https://app.libacrm.com"): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Liba+//CRM Calendar//PT",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:meeting-${meeting.id}@libacrm`,
    `DTSTAMP:${toICSDate(new Date())}`,
  ];

  if (meeting.isAllDay) {
    const d = meeting.startAt;
    lines.push(`DTSTART;VALUE=DATE:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`);
    const e = meeting.endAt;
    lines.push(`DTEND;VALUE=DATE:${e.getUTCFullYear()}${pad(e.getUTCMonth() + 1)}${pad(e.getUTCDate())}`);
  } else {
    lines.push(`DTSTART:${toICSDate(meeting.startAt)}`);
    lines.push(`DTEND:${toICSDate(meeting.endAt)}`);
  }

  lines.push(`SUMMARY:${escapeICS(meeting.title)}`);

  if (meeting.description) {
    lines.push(`DESCRIPTION:${escapeICS(meeting.description)}`);
  }

  if (meeting.location) {
    lines.push(`LOCATION:${escapeICS(meeting.location)}`);
  }

  const meetUrl = `${siteUrl}/meet/${meeting.meetingLink}`;
  lines.push(`URL:${meetUrl}`);

  if (organizerEmail) {
    lines.push(`ORGANIZER;CN=Liba+:mailto:${organizerEmail}`);
  }

  for (const att of meeting.attendees) {
    if (att.email) {
      lines.push(
        `ATTENDEE;CN=${escapeICS(att.name)};RSVP=TRUE;PARTSTAT=${att.responseStatus === "ACCEPTED" ? "ACCEPTED" : "NEEDS-ACTION"}:mailto:${att.email}`
      );
    }
  }

  lines.push("STATUS:CONFIRMED");
  lines.push(`X-LIBA-MEETING-URL:${meetUrl}`);
  lines.push("END:VEVENT");
  lines.push("END:VCALENDAR");

  return lines.map(foldLine).join("\r\n") + "\r\n";
}
