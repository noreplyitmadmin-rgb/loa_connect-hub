import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { subjectRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const subjects = await subjectRepository.list()

    return NextResponse.json({
      subjects: subjects.map((s) => ({ id: s.id, code: s.code, name: s.name })),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch reference data" }, { status: 500 })
  }
}
