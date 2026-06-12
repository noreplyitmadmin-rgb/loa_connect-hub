import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdminOrDean } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdminOrDean(request)
  if (authErr) return authErr

  const session = await auth()

  const { id } = await params

  const { data: existing, error: fetchErr } = await supabase
    .from("department_courses")
    .select("id, code, name")
    .eq("id", id)
    .single()
  if (fetchErr) return NextResponse.json({ error: "Course not found" }, { status: 404 })

  const { error } = await supabase
    .from("department_courses")
    .delete()
    .eq("id", id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const currentUserId = (session!.user as Record<string, unknown>).id as string
  await logAuditEvent({
    userId: currentUserId,
    action: "DELETE_DEPARTMENT_COURSE",
    details: `Deleted course ${existing.code} — ${existing.name}`,
  })

  return NextResponse.json({ success: true })
}
