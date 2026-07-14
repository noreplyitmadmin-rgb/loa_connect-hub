import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"
import { departmentCourseRepository, sectionRepository } from "@/lib/repositories/factory"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  try {
    const { name, departmentCourseId } = await request.json()
    if (!name || !departmentCourseId) {
      return NextResponse.json({ error: "Name and Department Course are required" }, { status: 400 })
    }

    const course = await departmentCourseRepository.findById(departmentCourseId)
    if (!course) {
      return NextResponse.json({ error: "Invalid department course" }, { status: 400 })
    }

    const sectionName = name.toUpperCase().trim()

    let data
    try {
      data = await sectionRepository.create({ name: sectionName, program: course.code, departmentCourseId, isDisabled: false })
    } catch (error) {
      if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
        return NextResponse.json({ error: `Section "${course.code}-${sectionName}" already exists` }, { status: 409 })
      }
      throw error
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_SECTION",
      details: `Created section ${course.code}-${sectionName}`,
    })

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
