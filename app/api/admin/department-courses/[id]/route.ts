import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdminOrDean } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"
import { departmentCourseRepository } from "@/lib/repositories/factory"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params

  const existing = await departmentCourseRepository.findById(id)
  if (!existing) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  await departmentCourseRepository.deleteById(id)

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "DELETE_DEPARTMENT_COURSE",
    details: `Deleted course ${existing.code} — ${existing.name}`,
  })

  return NextResponse.json({ success: true })
}
