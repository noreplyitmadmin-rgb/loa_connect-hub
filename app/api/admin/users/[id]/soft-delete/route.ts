import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { softDeleteUser } from "@/features/users/users.service"
import { logAuditEvent } from "@/lib/services/audit"
import { userRepository } from "@/lib/repositories/factory"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(_request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params
  const currentUserId = (session!.user as Record<string, unknown>).id as string

  try {
    const target = await userRepository.findById(id)
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (target.deletedAt) return NextResponse.json({ error: "User is already deleted" }, { status: 400 })

    await softDeleteUser(id)

    await logAuditEvent({
      userId: currentUserId,
      action: "DISABLE_USER",
      details: `Soft-deleted user: ${target.name} (${target.email})`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
