import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  try {
    const { faculty_id, subject_id, section_id, semesterId } = await request.json()
    if (!faculty_id || !subject_id || !section_id) {
      return NextResponse.json({ error: "faculty_id, subject_id, and section_id are required" }, { status: 400 })
    }

    const { data, error } = await supabase
      .from("faculty_subjects")
      .insert({ faculty_id, subject_id, section_id, semesterId: semesterId || null })
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "This mapping already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_FACULTY_SUBJECT",
      details: `Mapped faculty ${faculty_id} to subject ${subject_id} in section ${section_id}`,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
