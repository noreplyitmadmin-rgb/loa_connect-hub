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
