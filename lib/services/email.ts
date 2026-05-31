import nodemailer from "nodemailer"
import type Mail from "nodemailer/lib/mailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function isEmailEnabled() {
  return process.env.EMAIL_FEATURE_FLAG === "true"
}

export async function sendActivationEmail(email: string, name: string, activationUrl: string) {
  if (!isEmailEnabled()) {
    console.log("[DEV] Activation email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${email}`)
    console.log(`  Name: ${name}`)
    console.log(`  URL: ${activationUrl}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Activate Your e-Consultation Account",
    html: `
      <p>Hello ${name},</p>
      <p>Your account has been created. Click the link below to set your password:</p>
      <p><a href="${activationUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Activate Account</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">This link expires in 15 minutes. If you did not request this, please ignore this email.</p>
    `,
  })
}

export async function sendMeetingInviteEmail(
  email: string,
  name: string,
  meetingTitle: string,
  organizerName: string,
  date: string,
  startTime: string,
  endTime: string,
  inviteUrl: string
) {
  if (!isEmailEnabled()) {
    console.log("[DEV] Meeting invite email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${email}`)
    console.log(`  Name: ${name}`)
    console.log(`  Meeting: ${meetingTitle}`)
    console.log(`  URL: ${inviteUrl}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `Meeting Invitation: ${meetingTitle}`,
    html: `
      <p>Hello ${name},</p>
      <p><strong>${organizerName}</strong> has invited you to a meeting:</p>
      <div style="margin:16px 0;padding:16px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;">
        <p style="font-size:16px;font-weight:bold;margin:0 0 8px;">${meetingTitle}</p>
        <p style="margin:2px 0;color:#6b7280;">${date} &middot; ${startTime} &ndash; ${endTime}</p>
      </div>
      <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">View Meeting</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">This link expires in 7 days.</p>
    `,
  })
}

export async function sendConsultationInvite(
  to: { email: string; name: string },
  data: {
    studentName: string
    studentEmail: string
    facultyName: string
    facultyEmail: string
    date: string
    startTime: string
    endTime: string
    title?: string | null
    description?: string | null
    viewUrl: string,
    cc?: string | string[] | null
  },
  icalString?: string
) {
  const { consultationInviteHtml } = await import("@/lib/email-templates/consultation-invite")
  const html = consultationInviteHtml({
    recipientName: to.name,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    facultyName: data.facultyName,
    facultyEmail: data.facultyEmail,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    title: data.title,
    description: data.description,
    viewUrl: data.viewUrl,
    cc: data.cc,
  })

  if (!isEmailEnabled()) {
    console.log("[DEV] Consultation invite email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${to.email} (${to.name})`)
    console.log(`  .ics: ${icalString ? "attached" : "none"}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  const mail: Mail.Options = {
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject: `${data.studentName} is requesting for Consultation`,
    html,
    cc: data.cc ?? undefined,
    ...(icalString ? {
      attachments: [{
        filename: "event.ics",
        content: icalString,
        contentType: "text/calendar; charset=utf-8",
      }]
    } : {}),
  }

  await transporter.sendMail(mail)
}

export async function sendMeetingInviteWithICS(
  to: { email: string; name: string },
  data: {
    organizerName: string
    title: string
    description?: string | null
    date: string
    startTime: string
    endTime: string
    participantNames: string[]
    viewUrl: string,
    cc?: string | string[] | null
  },
  icalString?: string
) {
  const { meetingInviteHtml } = await import("@/lib/email-templates/meeting-invite")
  const html = meetingInviteHtml({
    recipientName: to.name,
    organizerName: data.organizerName,
    title: data.title,
    description: data.description,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    participantNames: data.participantNames,
    viewUrl: data.viewUrl,
    cc: data.cc,
  })

  if (!isEmailEnabled()) {
    console.log("[DEV] Consultation invite email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${to.email} (${to.name})`)
    console.log(`  .ics: ${icalString ? "attached" : "none"}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  const mail: Mail.Options = {
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject: `Consultation Invitation — ${data.title}`,
    html,
    ...(data.cc ? { cc: data.cc } : {}),
    ...(icalString ? {
      attachments: [{
        filename: "event.ics",
        content: icalString,
        contentType: "text/calendar; charset=utf-8",
      }]
    } : {}),
  }

  await transporter.sendMail(mail)
}

export async function sendApprovedWithTeamsLink(
  to: { email: string; name: string },
  ccList: { email: string; name: string }[],
  data: {
    studentName: string
    studentEmail: string
    facultyName: string
    facultyEmail: string
    date: string
    startTime: string
    endTime: string
    title?: string | null
    description?: string | null
    teamsLink: string | null
    viewUrl: string
  },
  icalString?: string
) {
  const { consultationApprovedHtml } = await import("@/lib/email-templates/consultation-approved")
  const html = consultationApprovedHtml({
    recipientName: to.name,
    studentName: data.studentName,
    studentEmail: data.studentEmail,
    facultyName: data.facultyName,
    facultyEmail: data.facultyEmail,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    title: data.title,
    description: data.description,
    teamsLink: data.teamsLink,
    viewUrl: data.viewUrl,
  })

  if (!isEmailEnabled()) {
    console.log("[DEV] Consultation approved email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${to.email} (${to.name})`)
    console.log(`  CC: ${ccList.map(c => c.email).join(", ")}`)
    console.log(`  Teams link: ${data.teamsLink}`)
    console.log(`  .ics: ${icalString ? "attached" : "none"}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  const mail: Mail.Options = {
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject: `Consultation Accepted — Microsoft Teams Link Inside`,
    html,
    cc: ccList.map(c => c.email),
    ...(icalString ? {
      attachments: [{
        filename: "event.ics",
        content: icalString,
        contentType: "text/calendar; charset=utf-8",
      }]
    } : {}),
  }

  await transporter.sendMail(mail)
}

export async function sendForgotPasswordEmail(email: string, name: string, resetUrl: string) {
  if (!isEmailEnabled()) {
    console.log("[DEV] Forgot password email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${email}`)
    console.log(`  Name: ${name}`)
    console.log(`  URL: ${resetUrl}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Reset Your e-Consultation Password",
    html: `
      <p>Hello ${name},</p>
      <p>Click the link below to reset your password:</p>
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p>
      <p style="color:#6b7280;font-size:12px;margin-top:16px;">This link expires in 15 minutes. If you did not request this, please ignore this email.</p>
    `,
  })
}

export async function sendBookingAcknowledgement(
  to: { email: string; name: string },
  data: {
    meetingTitle: string
    attendeeNames: string[]
    date: string
    startTime: string
    endTime: string
    viewUrl: string
    variant: "request" | "booking"
  }
) {
  const { bookingAcknowledgementHtml } = await import("@/lib/email-templates/booking-acknowledgement")
  const html = bookingAcknowledgementHtml({
    recipientName: to.name,
    meetingTitle: data.meetingTitle,
    attendeeNames: data.attendeeNames,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    viewUrl: data.viewUrl,
    variant: data.variant,
  })

  if (!isEmailEnabled()) {
    console.log("[DEV] Booking acknowledgement email (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${to.email} (${to.name})`)
    console.log(`  Meeting: ${data.meetingTitle}`)
    console.log(`  Attendees: ${data.attendeeNames.join(", ")}`)
    console.log(`  Variant: ${data.variant}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  const subject = data.variant === "request"
    ? `Consultation Request Sent: ${data.meetingTitle}`
    : `Meeting Created: ${data.meetingTitle}`

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject,
    html,
  })
}

export async function sendStatusUpdateEmail(
  to: { email: string; name: string },
  cc: { email: string; name: string }[],
  data: {
    variant: "cancelled" | "completed" | "accepted"
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
) {
  const { statusNotificationHtml } = await import("@/lib/email-templates/status-notification")
  const html = statusNotificationHtml({
    recipientName: to.name,
    variant: data.variant,
    actorName: data.actorName,
    meetingTitle: data.meetingTitle,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    description: data.description,
    viewUrl: data.viewUrl,
    extraInfo: data.extraInfo,
    attendeeNames: data.attendeeNames,
    isCreator: data.isCreator,
    meetingType: data.meetingType,
  })

  if (!isEmailEnabled()) {
    console.log(`[DEV] Status update (${data.variant}) email (EMAIL_FEATURE_FLAG=false):`)
    console.log(`  To: ${to.email} (${to.name})`)
    console.log(`  CC: ${cc.map(c => `${c.email} (${c.name})`).join(", ")}`)
    console.log(`  Appointment: ${data.meetingTitle}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  const subjectMap: Record<string, string> = {
    cancelled: `Cancelled: ${data.meetingTitle}`,
    completed: `Completed: ${data.meetingTitle}`,
    accepted: `Accepted: ${data.meetingTitle}`,
  }

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    cc: cc.map(c => c.email),
    subject: subjectMap[data.variant] || `Status Update: ${data.meetingTitle}`,
    html,
  })
}

export async function sendPasswordChangedEmail(email: string, name: string) {
  if (!isEmailEnabled()) {
    console.log("[DEV] Password changed notification (EMAIL_FEATURE_FLAG=false):")
    console.log(`  To: ${email}`)
    console.log(`  Name: ${name}`)
    return
  }

  if (!process.env.GMAIL_USER) throw new Error("GMAIL_USER env var not set")

  await transporter.sendMail({
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: "Your e-Consultation Password Has Been Changed",
    html: `
      <p>Hello ${name},</p>
      <p>Your e-Consultation account password was successfully changed.</p>
      <p>If you did this, you can ignore this email.</p>
      <p style="color:#dc2626;font-size:14px;margin-top:16px;"><strong>If you did NOT authorize this change, please contact your system administrator immediately to secure your account.</strong></p>
    `,
  })
}
