import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"
import { subjectRepository } from "@/lib/repositories/factory"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params

  try {
    const body = await request.json()
    const { code, name, isDisabled } = body

    const existing = await subjectRepository.findById(id)
    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (name !== undefined) updateData.name = name
    if (code !== undefined) updateData.code = code.toUpperCase()
    if (isDisabled !== undefined) updateData.isDisabled = !!isDisabled

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No changes provided" }, { status: 400 })
    }

    let data
    try {
      data = await subjectRepository.update(id, updateData)
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
        return NextResponse.json({ error: "Subject code already exists" }, { status: 409 })
      }
      throw error
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "UPDATE_SUBJECT",
      details: `Updated subject ${existing.code}: ${Object.keys(updateData).join(", ")}`,
    })

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
