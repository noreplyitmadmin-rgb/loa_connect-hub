import nodemailer from "nodemailer"

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

  const mail: any = {
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject: `${data.studentName} is requesting for Consultation`,
    html,
  }

  if (icalString) {
    mail.attachments = [{
      filename: "event.ics",
      content: icalString,
      contentType: "text/calendar; charset=utf-8",
    }]
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

  const mail: any = {
    from: `"e-Consultation" <${process.env.GMAIL_USER}>`,
    to: to.email,
    subject: `Consultation Invitation — ${data.title}`,
    html,
  }

  if (icalString) {
    mail.attachments = [{
      filename: "event.ics",
      content: icalString,
      contentType: "text/calendar; charset=utf-8",
    }]
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
