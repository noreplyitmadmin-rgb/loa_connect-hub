import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { departmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import { logAuditEvent } from "@/lib/services/audit"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized — Admin only" }, { status: 403 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { name, code, deanId, isDisabled } = body

    const existing = await departmentRepository.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    const auditActions: string[] = []

    if (name !== undefined) {
      updateData.name = name
      auditActions.push(`name to "${name}"`)
    }
    if (code !== undefined) {
      updateData.code = code.toUpperCase()
      auditActions.push(`code to "${code.toUpperCase()}"`)
    }
    if (deanId !== undefined) {
      updateData.deanId = deanId || null
      auditActions.push(deanId ? `dean to user ID ${deanId}` : "removed dean")
    }
    if (isDisabled !== undefined) {
      updateData.isDisabled = !!isDisabled
      auditActions.push(isDisabled ? "disabled department" : "enabled department")
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    const updated = await departmentRepository.update(id, updateData)

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "UPDATE_DEPARTMENT",
      details: `Updated department ${existing.code}: ${auditActions.join("; ")}`,
    })

    return NextResponse.json(updated)
  } catch (err: unknown) {
    const pgErr = err as Record<string, unknown>
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "Department code already exists" }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
