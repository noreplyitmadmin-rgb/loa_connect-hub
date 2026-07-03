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
    const { oldFacultySubjectId, newFacultyId } = await request.json()
    if (!oldFacultySubjectId || !newFacultyId) {
      return NextResponse.json({ error: "oldFacultySubjectId and newFacultyId are required" }, { status: 400 })
    }

    const { data: oldRecord, error: fetchErr } = await supabase
      .from("faculty_subjects")
      .select("id, faculty_id, subject_id, section_id, \"semesterId\"")
      .eq("id", oldFacultySubjectId)
      .single()

    if (fetchErr || !oldRecord) {
      return NextResponse.json({ error: "Faculty-subject mapping not found" }, { status: 404 })
    }

    if (oldRecord.faculty_id === newFacultyId) {
      return NextResponse.json({ error: "New faculty is the same as current faculty" }, { status: 400 })
    }

    const { error: updateErr } = await supabase
      .from("faculty_subjects")
      .update({ faculty_id: newFacultyId })
      .eq("id", oldFacultySubjectId)

    if (updateErr) {
      if (updateErr.code === "23505") {
        return NextResponse.json({ error: "This subject-section is already assigned to another faculty" }, { status: 409 })
      }
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    // Invalidate all existing evaluations for this faculty-subject mapping
    const adminName = (session!.user as Record<string, unknown>).name as string || "Unknown"
    const remarks = `Invalidated by user: ${adminName} - change of faculty assigned for the subject/section`
    await supabase
      .from("evaluations")
      .update({ status: "INVALID", remarks, isDisabled: true, updatedAt: new Date().toISOString() })
      .eq("facultySubjectId", oldFacultySubjectId)

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "REASSIGN_FACULTY_SUBJECT",
      details: `Reassigned faculty_subject ${oldFacultySubjectId} from faculty ${oldRecord.faculty_id} to faculty ${newFacultyId}`,
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
