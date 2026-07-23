import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"
import { sectionRepository, departmentCourseRepository } from "@/lib/repositories/factory"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  try {
    const sections = await sectionRepository.list()

    const fixes: { id: string; oldName: string; newName: string; program: string }[] = []

    for (const s of sections) {
      const dashPrefix = s.program + "-"
      const spacePrefix = s.program + " "
      const prefix = s.name.startsWith(dashPrefix) ? dashPrefix : s.name.startsWith(spacePrefix) ? spacePrefix : null
      if (!prefix) continue
      if (s.name.length <= prefix.length) continue

      const course = await departmentCourseRepository.findById(s.departmentCourseId)
      if (!course || course.code !== s.program) continue

      const newName = s.name.slice(prefix.length).trim()
      if (!newName) continue

      await sectionRepository.update(s.id, { name: newName })
      fixes.push({ id: s.id, oldName: s.name, newName, program: s.program })
    }

    if (fixes.length > 0) {
      const currentUserId = (session!.user as Record<string, unknown>).id as string
      await logAuditEvent({
        userId: currentUserId,
        action: "UPDATE_SECTION",
        details: `Bulk fixed ${fixes.length} section name(s): ${fixes.map((f) => `${f.oldName}→${f.newName}`).join(", ")}`,
      })
    }

    return NextResponse.json({ fixed: fixes.length, fixes })
  } catch {
    return NextResponse.json({ error: "Failed to fix section names" }, { status: 500 })
  }
}
