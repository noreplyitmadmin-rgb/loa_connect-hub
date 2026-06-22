import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { getActiveSemester } from "@/features/admin-data/semesters.service"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string
  if (!hasRole(role, "STUDENT") && !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const semesterId = searchParams.get("semesterId")
  const activeSemesterId = semesterId || (await getActiveSemester())?.id

  // Get enrolled faculty IDs for this student (if semester available)
  let enrolledIds = new Set<string>()
  if (activeSemesterId) {
    const { data: enrollments } = await supabase
      .from("student_enrollments")
      .select("section_id, faculty_subject_id")
      .eq("student_id", userId)
      .eq("semesterId", activeSemesterId)
    if (enrollments && enrollments.length > 0) {
      const directIds = enrollments
        .filter((r) => r.faculty_subject_id)
        .map((r) => r.faculty_subject_id)
      if (directIds.length > 0) {
        const { data: facultySubjects } = await supabase
          .from("faculty_subjects")
          .select("faculty_id")
          .in("id", directIds)
        if (facultySubjects) {
          enrolledIds = new Set(facultySubjects.map((r) => r.faculty_id))
        }
      } else {
        // Fallback: no faculty_subject_id — scope by section
        const sectionIds = enrollments.map((r) => r.section_id)
        const { data: facultySubjects } = await supabase
          .from("faculty_subjects")
          .select("faculty_id")
          .in("section_id", sectionIds)
          .eq("semesterId", activeSemesterId)
        if (facultySubjects) {
          enrolledIds = new Set(facultySubjects.map((r) => r.faculty_id))
        }
      }
    }
  }

  let faculties: { id: string; name: string; email: string }[] = []

  if (!q || q.length < 2) {
    // No search query — return enrolled faculty as suggestions
    if (enrolledIds.size > 0) {
      const { data } = await supabase
        .from("users")
        .select("id, name, email")
        .in("id", [...enrolledIds])
        .limit(20)
      faculties = data || []
    }
  } else {
    // Search all faculty by name/email
    const { data } = await supabase
      .from("users")
      .select("id, name, email, userrole!inner(roleName)")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .eq("userrole.roleName", "FACULTY")
      .limit(20)
    // Also search DEAN role users
    const { data: deans } = await supabase
      .from("users")
      .select("id, name, email, userrole!inner(roleName)")
      .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
      .eq("userrole.roleName", "DEAN")
      .limit(20)
    const merged = new Map<string, { id: string; name: string; email: string }>()
    for (const f of data || []) merged.set(f.id, f)
    for (const f of deans || []) merged.set(f.id, f)
    faculties = [...merged.values()]
  }

  const result = faculties.map((f) => ({
    ...f,
    isEnrolled: enrolledIds.has(f.id),
  }))

  return NextResponse.json({ faculty: result })
}
