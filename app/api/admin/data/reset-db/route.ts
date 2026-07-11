import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { auth } from "@/lib/auth"
import { resetDatabase } from "@/features/admin-data/reset-db.service"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()
  const currentUserId = (session!.user as Record<string, unknown>).id as string

  try {
    const result = await resetDatabase()

    await logAuditEvent({
      userId: currentUserId,
      action: "RESET_DATABASE",
      details: result.success
        ? `Database reset completed. ${result.statementsExecuted} statements executed.`
        : `Database reset failed at statement ${result.statementsExecuted + 1}. ${result.error}`,
    })

    if (!result.success) {
      return NextResponse.json({ error: result.error, statementsExecuted: result.statementsExecuted }, { status: 500 })
    }

    return NextResponse.json({ success: true, statementsExecuted: result.statementsExecuted })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
