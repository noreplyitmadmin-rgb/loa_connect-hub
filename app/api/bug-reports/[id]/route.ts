import { NextRequest, NextResponse } from "next/server"
import { bugReportRepository } from "@/lib/repositories/factory"
import { requireAdmin } from "@/lib/route-guard"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const { id } = await params
  const body = await req.json()
  const { status } = body as { status?: string }

  if (status !== "open" && status !== "resolved") {
    return NextResponse.json({ error: "Status must be 'open' or 'resolved'" }, { status: 400 })
  }

  const report = await bugReportRepository.updateStatus(id, status)
  return NextResponse.json({ report })
}
