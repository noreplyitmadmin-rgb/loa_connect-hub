import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { departmentRepository, departmentCourseRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const [departments, departmentCourses] = await Promise.all([
      departmentRepository.listAll(),
      departmentCourseRepository.findAll(),
    ])

    return NextResponse.json({
      departments: departments.map((d) => ({ id: d.id, code: d.code })),
      departmentCourses: departmentCourses.map((c) => ({ id: c.id, departmentId: c.departmentId, code: c.code })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reference data" }, { status: 500 })
  }
}
