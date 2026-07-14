import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdminOrDean } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"
import { departmentCourseRepository, departmentRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  try {
    const [courses, departments] = await Promise.all([
      departmentCourseRepository.findAll(),
      departmentRepository.listAll(),
    ])

    const deptsMap = new Map(departments.map((d) => [d.id, d]))
    const joinedData = courses.map((c) => ({
      ...c,
      department: deptsMap.get(c.departmentId) || null,
    }))

    return NextResponse.json(joinedData)
  } catch {
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  const session = await auth()

  const body = await request.json()
  const { departmentId, name, code } = body

  if (!departmentId || !name || !code) {
    return NextResponse.json({ error: "departmentId, name, and code are required" }, { status: 400 })
  }

  let data
  try {
    data = await departmentCourseRepository.create({ departmentId, name, code })
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "23505") {
      return NextResponse.json({ error: "Course code already exists for this department" }, { status: 409 })
    }
    throw error
  }

  const dept = await departmentRepository.findById(departmentId)

  const responseData = {
    ...data,
    department: dept ? { name: dept.name, code: dept.code } : null,
  }

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "CREATE_DEPARTMENT_COURSE",
    details: `Created course ${code} — ${name} for department ${departmentId}`,
  })

  return NextResponse.json(responseData)
}
