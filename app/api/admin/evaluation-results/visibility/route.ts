import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { semesterId, facultyIds, visible } = body as {
      semesterId: string
      facultyIds: string[]
      visible: boolean
    }

    if (!semesterId || !facultyIds?.length) {
      return NextResponse.json({ error: "semesterId and facultyIds are required" }, { status: 400 })
    }

    await evaluationResultRepository.setVisibility(semesterId, facultyIds, visible)
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Visibility toggle error:", e)
    return NextResponse.json({ error: "Failed to update visibility" }, { status: 500 })
  }
}
