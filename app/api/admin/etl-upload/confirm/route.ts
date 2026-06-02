import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { userRepository, departmentRepository, auditLogRepository } from "@/lib/repositories/factory"
import { passwordResetTokenRepository } from "@/lib/repositories/factory"
import { STUDENT_ROLE, FACULTY_ROLE, DEAN_ROLE, type EtlUploadType } from "@/lib/constants"
import { sendActivationWorkflow } from "@/lib/workflows/email-workflows"
import { randomBytes } from "crypto"

export interface ConfirmRow {
  name: string
  email: string
  department: string | null
  course: string | null
  isDean: boolean
}

interface ConfirmBody {
  type: EtlUploadType
  rows: ConfirmRow[]
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: ConfirmBody = await req.json()
  const { type, rows } = body

  const created: { name: string; email: string; role: string }[] = []
  const failed: { email: string; error: string }[] = []

  // Throttle work by processing rows in bounded batches to avoid overwhelming
  // downstream services (DB, email provider). Batch size is configurable via
  // `ETL_BATCH_SIZE` env var. Default to 10 concurrent operations.
  const BATCH_SIZE = Number(process.env.ETL_BATCH_SIZE) || 10
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)

    await Promise.all(
      batch.map(async (row) => {
        try {
          const existing = await userRepository.findByEmail(row.email)
          if (existing) {
            failed.push({ email: row.email, error: "Email already exists" })
            return
          }

          let departmentId: string | null = null
          if (row.department) {
            const allDepts = await departmentRepository.listAll()
            const dept =
              allDepts.find((d) => d.name.toLowerCase() === row.department!.toLowerCase()) ||
              allDepts.find((d) => d.code.toLowerCase() === row.department!.toLowerCase())
            if (dept) departmentId = dept.id
          }

          const role = type === "student" ? STUDENT_ROLE : row.isDean ? DEAN_ROLE : FACULTY_ROLE

          const user = await userRepository.create({
            name: row.name,
            email: row.email,
            passwordHash: null,
            role,
            departmentId,
            course: row.course,
          })

          const token = randomBytes(32).toString("hex")
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
          await passwordResetTokenRepository.create(user.email, token, expiresAt)

          const activationUrl = `${process.env.NEXTAUTH_URL}/activate?token=${token}`
          // Fire-and-forget, but limited by batch concurrency above
          sendActivationWorkflow(user.email, user.name, activationUrl).catch(() => {})

          created.push({ name: user.name, email: user.email, role: user.role })
        } catch (err) {
          failed.push({ email: row.email, error: err instanceof Error ? err.message : "Unknown error" })
        }
      })
    )

    // Small delay between batches to ease transient rate limits (100ms)
    if (i + BATCH_SIZE < rows.length) await new Promise((r) => setTimeout(r, 100))
  }

  if (created.length > 0) {
    await auditLogRepository.create({
      userId: (session.user as Record<string, unknown>).id as string ?? null,
      email: (session.user as Record<string, unknown>).email as string ?? null,
      action: "ETL_UPLOAD",
      details: `Created ${created.length} ${type} user(s)${failed.length > 0 ? `, ${failed.length} failed` : ""}`,
    })
  }

  return NextResponse.json({ created, failed })
}
