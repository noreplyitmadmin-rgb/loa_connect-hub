import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params

  const { error: fetchErr } = await supabase
    .from("faculty_subjects")
    .select("id")
    .eq("id", id)
    .single()
  if (fetchErr) return NextResponse.json({ error: "Mapping not found" }, { status: 404 })

  const { error } = await supabase.from("faculty_subjects").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "DELETE_FACULTY_SUBJECT",
    details: `Deleted faculty-subject mapping ${id}`,
  })

  return NextResponse.json({ success: true })
}
