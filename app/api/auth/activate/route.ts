import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { randomBytes } from "crypto"
import { sendActivationEmail } from "@/lib/services/email"

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json({ error: "No account found with this email", code: "NOT_FOUND" }, { status: 404 })
    }

    if (user.hasLoggedInBefore) {
      return NextResponse.json({ error: "Account already activated", code: "ALREADY_ACTIVATED" }, { status: 400 })
    }

    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)

    await prisma.passwordResetToken.create({
      data: { email: user.email, token, expiresAt },
    })

    const activationUrl = `${process.env.NEXTAUTH_URL}/change-password?token=${token}`

    await sendActivationEmail(user.email, user.name, activationUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Activate error:", error)
    const message = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json({ error: message, code: "SERVER_ERROR" }, { status: 500 })
  }
}
