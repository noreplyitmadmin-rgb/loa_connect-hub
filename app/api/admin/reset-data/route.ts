import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { hasRole } from "@/lib/utils/roles"

const SEED_USER_IDS = [
  "a0000000-0000-0000-0000-000000000001", // Admin
  "c0000000-0000-0000-0000-000000000001", // Regie Ellana
  "d0000000-0000-0000-0000-000000000001", // Nin Alamo
]
const SEED_DEPT_IDS = ["b0000000-0000-0000-0000-000000000001"] // CCS
const SEED_COURSE_IDS = [
  "f0000000-0000-0000-0000-000000000001", // BSIT
  "f0000000-0000-0000-0000-000000000002", // BSCS
]

function idList(ids: string[]) {
  return `(${ids.join(",")})`
}

export async function POST() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  for (const table of [
    "evaluation_ratings",
    "evaluation_comments",
    "evaluation_results",
    "evaluations",
    "student_enrollments",
    "faculty_subjects",
    "sections",
    "subjects",
    "rubric_items",
    "rubric_categories",
    "rating_scales",
    "appointment_time_slots",
    "appointment_attendees",
    "appointment_files",
    "appointments",
    "faculty_availability_rules",
    "password_reset_tokens",
    "accounts",
    "sessions",
    "audit_logs",
  ]) {
    const { error } = await supabase.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) return NextResponse.json({ error: `Failed to clear ${table}: ${error.message}` }, { status: 500 })
  }

  {
    const { error } = await supabase.from("verification_tokens").delete().neq("token", "")
    if (error) return NextResponse.json({ error: `Failed to clear verification_tokens: ${error.message}` }, { status: 500 })
  }

  const { error: deptCourseErr } = await supabase
    .from("department_courses")
    .delete()
    .not("id", "in", idList(SEED_COURSE_IDS))
  if (deptCourseErr) return NextResponse.json({ error: `Failed to clear department_courses: ${deptCourseErr.message}` }, { status: 500 })

  const { error: userroleErr } = await supabase
    .from("userrole")
    .delete()
    .not("userId", "in", idList(SEED_USER_IDS))
  if (userroleErr) return NextResponse.json({ error: `Failed to clear userrole: ${userroleErr.message}` }, { status: 500 })

  const { error: usersErr } = await supabase
    .from("users")
    .delete()
    .not("id", "in", idList(SEED_USER_IDS))
  if (usersErr) return NextResponse.json({ error: `Failed to clear users: ${usersErr.message}` }, { status: 500 })

  const { error: deptErr } = await supabase
    .from("departments")
    .delete()
    .not("id", "in", idList(SEED_DEPT_IDS))
  if (deptErr) return NextResponse.json({ error: `Failed to clear departments: ${deptErr.message}` }, { status: 500 })

  return NextResponse.json({ success: true })
}
