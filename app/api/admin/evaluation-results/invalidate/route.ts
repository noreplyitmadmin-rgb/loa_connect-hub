import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { supabase } from "@/lib/supabase"
import { evaluationResultRepository } from "@/lib/repositories/factory"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { periodId, facultyId, facultySubjectId, reason } = body as { periodId?: string; facultyId?: string; facultySubjectId?: string; reason?: string }
    if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })
    if (!facultyId && !facultySubjectId) return NextResponse.json({ error: "facultyId or facultySubjectId is required" }, { status: 400 })

    // Build query to mark matching evaluations as disabled
    let q = supabase.from("evaluations").update({ isDisabled: true }).eq("semesterId", periodId).eq("status", "SUBMITTED")
    if (facultySubjectId) {
      q = q.eq("facultySubjectId", facultySubjectId)
    } else if (facultyId) {
      q = q.eq("evaluateeId", facultyId)
    }

    const { error } = await q
    if (error) throw error

    // Recompute aggregated results for the period
    await evaluationResultRepository.computeAll(periodId)

    // Audit
    await logAuditEvent({ action: "invalidate_evaluations", details: JSON.stringify({ periodId, facultyId, facultySubjectId, reason }) }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Invalidate evaluations error:", e)
    return NextResponse.json({ error: "Failed to invalidate evaluations" }, { status: 500 })
  }
}
