import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authErr = await requireAdmin(_request)
  if (authErr) return authErr

  const { id } = await params

  const queries = await Promise.allSettled([
    supabase.from("evaluations").select("id, evaluatorId, evaluateeId, createdAt").or(`evaluatorId.eq.${id},evaluateeId.eq.${id}`).limit(100),
    supabase.from("evaluation_results").select("id, facultyId, semesterId, createdAt").eq("facultyId", id).limit(100),
    supabase.from("user_permissions").select("id, user_id, resource_path, effect").eq("user_id", id).limit(100),
    supabase.from("faculty_subjects").select("id, faculty_id, subject_id, section_id").eq("faculty_id", id).limit(100),
    supabase.from("appointments").select("id, studentId, facultyId, status, startTime").or(`studentId.eq.${id},facultyId.eq.${id}`).limit(100),
    supabase.from("appointment_attendees").select("id, userId, appointmentId").eq("userId", id).limit(100),
    supabase.from("faculty_availability_rules").select("id, facultyId, dayOfWeek").eq("facultyId", id).limit(100),
    supabase.from("student_enrollments").select("id, student_id, faculty_subject_id").eq("student_id", id).limit(100),
    supabase.from("departments").select("id, name, \"deanId\"").eq("deanId", id).limit(100),
  ])

  const related: Record<string, unknown[]> = {}

  const labels = [
    "evaluations",
    "evaluation_results",
    "user_permissions",
    "faculty_subjects",
    "appointments",
    "appointment_attendees",
    "faculty_availability_rules",
    "student_enrollments",
    "departments",
  ] as const

  for (let i = 0; i < queries.length; i++) {
    const result = queries[i]
    const key = labels[i]
    if (result.status === "fulfilled" && result.value.data) {
      related[key] = result.value.data
    } else {
      related[key] = []
    }
  }

  const summary = Object.entries(related).map(([table, rows]) => ({
    table,
    count: rows.length,
    label: table.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

  return NextResponse.json({ related, summary })
}
