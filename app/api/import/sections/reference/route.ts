import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { departmentRepository, departmentCourseRepository, sectionRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const [departments, departmentCourses, sections] = await Promise.all([
      departmentRepository.listAll(),
      departmentCourseRepository.findAll(),
      sectionRepository.list(),
    ])

    const deptsMap = new Map(departments.map((d) => [d.id, d]))
    const enrichedCourses = departmentCourses.map((c) => ({
      ...c,
      department: deptsMap.get(c.departmentId) || null,
    }))

    return NextResponse.json({
      departments: departments.map((d) => ({ id: d.id, code: d.code, name: d.name })),
      departmentCourses: enrichedCourses,
      sections: sections.map((s) => ({ id: s.id, name: s.name, program: s.program, departmentCourseId: s.departmentCourseId })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reference data" }, { status: 500 })
  }
}
