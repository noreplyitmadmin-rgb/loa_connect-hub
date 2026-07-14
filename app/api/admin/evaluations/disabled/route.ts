import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { evaluationRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const evaluations = await evaluationRepository.listDisabled()
    return NextResponse.json({ evaluations })
  } catch {
    return NextResponse.json({ error: "Failed to fetch disabled evaluations" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()

    if (body.all) {
      await evaluationRepository.deleteDisabled()
    } else if (body.ids && Array.isArray(body.ids) && body.ids.length > 0) {
      await evaluationRepository.deleteDisabled(body.ids)
    } else {
      return NextResponse.json({ error: "No ids provided" }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete evaluations" }, { status: 500 })
  }
}
