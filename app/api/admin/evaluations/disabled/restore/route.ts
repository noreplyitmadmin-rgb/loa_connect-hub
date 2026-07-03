import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { supabase } from "@/lib/supabase"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const body = await request.json()
    const { ids } = body as { ids: string[] }
    if (!ids || !Array.isArray(ids) || ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 })

    const { error } = await supabase.from("evaluations").update({ isDisabled: false }).in("id", ids)
    if (error) throw error

    await logAuditEvent({ action: "restore_evaluations", details: JSON.stringify({ ids }) }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Restore evaluations error:", e)
    return NextResponse.json({ error: "Failed to restore evaluations" }, { status: 500 })
  }
}
