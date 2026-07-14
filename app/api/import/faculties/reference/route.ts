import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { subjectRepository, sectionRepository, userRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const [subjects, sections, users] = await Promise.all([
      subjectRepository.list(),
      sectionRepository.list(),
      userRepository.listAll(),
    ])

    return NextResponse.json({
      subjects: subjects.map((s) => ({ id: s.id, code: s.code })),
      sections: sections.map((s) => ({ id: s.id, name: s.name, program: s.program })),
      users: users.map((u) => ({ id: u.id, email: u.email.toLowerCase(), role: u.role || null })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reference data" }, { status: 500 })
  }
}
