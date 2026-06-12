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
    .from("student_enrollments")
    .select("id")
    .eq("id", id)
    .single()
  if (fetchErr) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 })

  const { error } = await supabase.from("student_enrollments").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "DELETE_ENROLLMENT",
    details: `Deleted enrollment ${id}`,
  })

  return NextResponse.json({ success: true })
}
