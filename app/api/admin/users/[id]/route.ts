import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { permanentDeleteUser } from "@/lib/controllers/admin-users"
import { logAuditEvent } from "@/lib/services/audit"
import { userRepository } from "@/lib/repositories/factory"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { id } = await params
  const currentUserId = (session!.user as Record<string, unknown>).id as string

  try {
    const target = await userRepository.findById(id)
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

    await permanentDeleteUser(id)

    await logAuditEvent({
      userId: currentUserId,
      action: "PERMANENT_DELETE_USER",
      details: `Permanently deleted user ${target.name} (${target.email})`,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
