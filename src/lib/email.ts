import { Resend } from "resend";
import { generateICS } from "./ics";
import { getSiteUrl } from "./supabase/env";

// NOTE: RESEND_FROM must be a verified sender in your Resend account.
// While testing: use "onboarding@resend.dev" (can only send to your Resend-registered email).
// For production: verify libamais.com.br in https://resend.com/domains and set:
//   RESEND_FROM="Liba+ <noreply@libamais.com.br>"

export type EmailMeeting = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  isAllDay: boolean;
  location: string | null;
  meetingLink: string;
  timezone: string;
  attendees: { name: string; email: string | null }[];
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(d: Date, tz: string) {
  return d.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
function fmtTime(d: Date, tz: string) {
  return d.toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}
function fmtDuration(startAt: Date, endAt: Date) {
  const min = Math.round((endAt.getTime() - startAt.getTime()) / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

// ── HTML template ─────────────────────────────────────────────────────────────

function buildHTML(m: EmailMeeting, meetingUrl: string): string {
  const tz = m.timezone || "America/Sao_Paulo";
  const dateStr = fmtDate(m.startAt, tz);
  const timeStr = m.isAllDay ? "O dia todo" : `${fmtTime(m.startAt, tz)} – ${fmtTime(m.endAt, tz)} (${fmtDuration(m.startAt, m.endAt)})`;
  const guestRows = m.attendees
    .filter(a => a.email)
    .map(a => `<li style="margin:0 0 4px 0;font-size:13px;color:#4b5563;">${esc(a.name)}${a.email ? ` — <span style="color:#6b7280;">${esc(a.email)}</span>` : ""}</li>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(m.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
<tr><td>
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">

  <!-- Logo -->
  <tr>
    <td style="text-align:center;padding:0 0 20px;">
      <span style="font-size:30px;font-weight:900;letter-spacing:-1px;line-height:1;">
        <span style="color:#111827;">LIBA</span><span style="color:#22c55e;">+</span>
      </span>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;">CRM &amp; Agenda</p>
    </td>
  </tr>

  <!-- Main card -->
  <tr>
    <td style="background:#fff;border-radius:20px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 8px 32px rgba(0,0,0,0.07);">

      <!-- Green header -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:linear-gradient(135deg,#16a34a 0%,#4ade80 100%);padding:28px 32px 24px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);letter-spacing:1.2px;text-transform:uppercase;">
              📅 &nbsp;Convite de Reunião
            </p>
            <h1 style="margin:0;font-size:26px;font-weight:800;color:#fff;line-height:1.25;letter-spacing:-0.3px;">
              ${esc(m.title)}
            </h1>
          </td>
        </tr>
      </table>

      <!-- Body -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:32px;">

            <!-- Date/time card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:14px;margin-bottom:28px;">
              <tr>
                <td style="padding:20px 24px;">
                  <!-- Date row -->
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="font-size:22px;vertical-align:top;padding-right:12px;line-height:1;">📅</td>
                      <td style="vertical-align:top;">
                        <p style="margin:0;font-size:15px;font-weight:700;color:#15803d;text-transform:capitalize;">${esc(dateStr)}</p>
                      </td>
                    </tr>
                  </table>
                  <!-- Time row -->
                  <table cellpadding="0" cellspacing="0" style="margin-top:10px;">
                    <tr>
                      <td style="font-size:22px;vertical-align:top;padding-right:12px;line-height:1;">🕐</td>
                      <td style="vertical-align:top;">
                        <p style="margin:0;font-size:15px;font-weight:700;color:#15803d;">${esc(timeStr)}</p>
                        <p style="margin:2px 0 0;font-size:12px;color:#4ade80;">${esc(tz)}</p>
                      </td>
                    </tr>
                  </table>
                  ${m.location ? `
                  <!-- Location -->
                  <table cellpadding="0" cellspacing="0" style="margin-top:10px;">
                    <tr>
                      <td style="font-size:22px;vertical-align:top;padding-right:12px;line-height:1;">📍</td>
                      <td style="vertical-align:top;">
                        <p style="margin:0;font-size:14px;color:#166534;">${esc(m.location)}</p>
                      </td>
                    </tr>
                  </table>` : ""}
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr>
                <td style="text-align:center;">
                  <a href="${meetingUrl}" target="_blank"
                    style="display:inline-block;background:#22c55e;color:#fff;font-size:16px;font-weight:700;padding:15px 40px;border-radius:12px;text-decoration:none;letter-spacing:0.2px;">
                    🎥 &nbsp;Entrar na Videoconferência
                  </a>
                  <p style="margin:10px 0 0;font-size:12px;color:#94a3b8;">
                    Link direto:<br>
                    <a href="${meetingUrl}" style="color:#22c55e;word-break:break-all;font-size:12px;">${meetingUrl}</a>
                  </p>
                </td>
              </tr>
            </table>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="height:1px;background:#f1f5f9;"></td></tr>
            </table>

            ${m.description ? `
            <!-- Description -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="border-left:3px solid #22c55e;padding:4px 0 4px 16px;">
                  <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Descrição</p>
                  <p style="margin:0;font-size:14px;color:#374151;line-height:1.65;">${esc(m.description).replace(/\n/g, "<br>")}</p>
                </td>
              </tr>
            </table>` : ""}

            ${guestRows ? `
            <!-- Guests -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td>
                  <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">Participantes</p>
                  <ul style="margin:0;padding:0 0 0 18px;">${guestRows}</ul>
                </td>
              </tr>
            </table>` : ""}

            <!-- ICS notice -->
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#f8fafc;border-radius:12px;padding:18px 20px;border:1px solid #e2e8f0;">
                  <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#374151;">
                    📎 &nbsp;Adicionar ao seu Calendário
                  </p>
                  <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">
                    O arquivo <strong>.ics</strong> está anexo a este e-mail.<br>
                    Abra-o para adicionar automaticamente ao <strong>Google Calendar</strong>, <strong>Outlook</strong> ou <strong>Apple Calendar</strong>.
                  </p>
                </td>
              </tr>
            </table>

          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="text-align:center;padding:20px 16px 8px;">
      <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;">
        Enviado por &nbsp;<strong style="color:#6b7280;font-size:13px;">LIBA<span style="color:#22c55e;">+</span> CRM</strong>
      </p>
      <p style="margin:0;font-size:11px;color:#cbd5e1;">
        Você recebeu este convite porque foi adicionado como participante de uma reunião.
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ── Send function ─────────────────────────────────────────────────────────────

export async function sendMeetingInvite(
  meeting: EmailMeeting,
  organizerEmail: string
): Promise<{ sent: number; skipped: number; errors: string[] }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping");
    return { sent: 0, skipped: 0, errors: ["RESEND_API_KEY not configured"] };
  }

  const resend = new Resend(apiKey);
  const FROM = process.env.RESEND_FROM ?? "Liba+ <onboarding@resend.dev>";
  const siteUrl = getSiteUrl();
  const meetingUrl = `${siteUrl}/meet/${meeting.meetingLink}`;

  // Build ICS (reuse existing generator, map to expected shape)
  const icsContent = generateICS(
    {
      ...meeting,
      attendees: meeting.attendees.map(a => ({ ...a, responseStatus: "NEEDS-ACTION" })),
    },
    organizerEmail,
    siteUrl
  );
  const icsBuffer = Buffer.from(icsContent);
  const html = buildHTML(meeting, meetingUrl);

  const recipients = meeting.attendees
    .filter(a => a.email && a.email.includes("@"))
    .map(a => a.email as string);

  // Always include the organizer so they have the invite in their inbox too
  if (organizerEmail && !recipients.includes(organizerEmail)) {
    recipients.push(organizerEmail);
  }

  if (!recipients.length) return { sent: 0, skipped: 0, errors: [] };

  const errors: string[] = [];
  let sent = 0;
  let skipped = 0;

  for (const to of recipients) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to,
        subject: `📅 Convite: ${meeting.title}`,
        html,
        attachments: [
          {
            filename: "convite-liba.ics",
            content: icsBuffer,
            contentType: "text/calendar; charset=utf-8; method=REQUEST",
          },
        ],
      });
      if (error) {
        console.error(`[email] Failed → ${to}:`, error);
        errors.push(`${to}: ${error.message}`);
        skipped++;
      } else {
        sent++;
      }
    } catch (e) {
      console.error(`[email] Exception → ${to}:`, e);
      errors.push(`${to}: ${String(e)}`);
      skipped++;
    }
  }

  return { sent, skipped, errors };
}
