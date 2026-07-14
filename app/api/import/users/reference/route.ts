import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { userRepository, departmentRepository, departmentCourseRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const [users, departments, departmentCourses] = await Promise.all([
      userRepository.listAll(),
      departmentRepository.listAll(),
      departmentCourseRepository.findAll(),
    ])

    const deptsMap = new Map(departments.map((d) => [d.id, d]))
    const enrichedCourses = departmentCourses.map((c) => ({
      id: c.id,
      departmentId: c.departmentId,
      code: c.code,
      name: c.name,
      department: deptsMap.get(c.departmentId) || null,
    }))

    return NextResponse.json({
      users: users.map((u) => ({ id: u.id, email: u.email.toLowerCase() })),
      departments: departments.map((d) => ({ id: d.id, code: d.code })),
      departmentCourses: enrichedCourses,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reference data" }, { status: 500 })
  }
}
