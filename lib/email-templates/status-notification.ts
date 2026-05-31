export type StatusVariant = "cancelled" | "completed" | "accepted"

export interface StatusNotificationData {
  recipientName: string
  variant: StatusVariant
  actorName: string
  meetingTitle: string
  date: string
  startTime: string
  endTime: string
  description?: string | null
  viewUrl: string
  extraInfo?: string | null
  attendeeNames: string[]
  isCreator: boolean
  meetingType: "CONSULTATION" | "INTERNAL"
}

function statusConfig(variant: StatusVariant, isCreator: boolean, meetingType: string, actorName: string) {
  if (variant === "cancelled") {
    return {
      badgeBg: "#dc2626",
      cardBg: "#fef2f2",
      cardBorder: "#fecaca",
      cardText: "#991b1b",
      icon: "🗑️",
      header: "Appointment Cancelled",
      title: "An appointment has been cancelled",
      subtitle: `${actorName} cancelled this appointment.`,
      ctaText: "View Appointment",
      footer: "If you have questions about this cancellation, please contact the organiser.",
    }
  }

  if (variant === "completed") {
    return {
      badgeBg: "#059669",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      cardText: "#166534",
      icon: "✅",
      header: "Appointment Completed",
      title: "An appointment has been marked as completed",
      subtitle: `${actorName} completed this appointment.`,
      ctaText: "View Appointment",
      footer: "Actions taken and other details are available in the appointment record.",
    }
  }

  if (variant === "accepted") {
    if (isCreator && meetingType === "INTERNAL") {
      return {
        badgeBg: "#059669",
        cardBg: "#f0fdf4",
        cardBorder: "#bbf7d0",
        cardText: "#166534",
        icon: "✅",
        header: "Appointment Accepted",
        title: "You accepted your appointment",
        subtitle: "Your appointment has been accepted. Invitations are being sent to attendees.",
        ctaText: "View Appointment",
        footer: "All attendees will be notified about this appointment.",
      }
    }
    return {
      badgeBg: "#059669",
      cardBg: "#f0fdf4",
      cardBorder: "#bbf7d0",
      cardText: "#166534",
      icon: "✅",
      header: "Appointment Accepted",
      title: "Your appointment has been accepted",
      subtitle: `${actorName} has accepted the appointment.`,
      ctaText: "View Appointment",
      footer: "You can view the meeting details and add it to your calendar below.",
    }
  }

  throw new Error(`Unknown variant: ${variant}`)
}

export function statusNotificationHtml(data: StatusNotificationData): string {
  const cfg = statusConfig(data.variant, data.isCreator, data.meetingType, data.actorName)
  const attendeeList = data.attendeeNames.join(", ")
  const extraLines = data.extraInfo ? data.extraInfo.split("\n") : []

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
  <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
    <tr><td style="background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;">${cfg.icon} ${cfg.header}</p>
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${cfg.title}</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#475569;">${cfg.subtitle}</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="background:${cfg.cardBg};border:1px solid ${cfg.cardBorder};border-radius:10px;margin-bottom:24px;">
        <tr><td style="padding:20px;">

          <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:${cfg.cardText};">${escapeHtml(data.meetingTitle)}</p>

          <table cellpadding="0" cellspacing="0" style="color:#475569;font-size:14px;">
            <tr><td style="padding:3px 0;vertical-align:top;width:24px;">📅</td><td style="padding:3px 0;color:#0f172a;font-weight:600;">${escapeHtml(data.date)}</td></tr>
            <tr><td style="padding:3px 0;vertical-align:top;">⏰</td><td style="padding:3px 0;color:#0f172a;font-weight:600;">${escapeHtml(data.startTime)} – ${escapeHtml(data.endTime)}</td></tr>
            <tr><td style="padding:3px 0;vertical-align:top;">👥</td><td style="padding:3px 0;color:#0f172a;font-weight:600;">${escapeHtml(attendeeList)}</td></tr>
          </table>

          ${extraLines.length > 0 ? `
          <hr style="border:none;border-top:1px solid ${cfg.cardBorder};margin:16px 0;">
          ${extraLines.map(line => `<p style="margin:2px 0;font-size:13px;color:${cfg.cardText};">${escapeHtml(line)}</p>`).join("")}
          ` : ""}

        </td></tr>
      </table>

      <table cellpadding="0" cellspacing="0">
        <tr><td style="border-radius:8px;background:${cfg.badgeBg};padding:0;">
          <a href="${escapeHtml(data.viewUrl)}" style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${cfg.ctaText}</a>
        </td></tr>
      </table>

      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        ${cfg.footer}
      </p>

    </td></tr>
  </table>
</td></tr></table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
