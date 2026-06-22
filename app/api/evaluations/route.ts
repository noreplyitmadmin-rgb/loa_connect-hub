import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { getOrCreateEvaluation, getEvaluation, getMyEvaluations } from "@/features/evaluations/evaluations.service"
import { getActiveSemester } from "@/features/admin-data/semesters.service"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const evaluations = await getMyEvaluations(userId)
    const facultyIds = [...new Set(evaluations.map((e) => e.evaluateeId))]
    const { data: facultyUsers } = await supabase
      .from("users")
      .select("id, name")
      .in("id", facultyIds)
    const nameMap = new Map((facultyUsers || []).map((u) => [u.id, u.name]))
    const result = evaluations.map((e) => ({
      ...e,
      evaluateeName: nameMap.get(e.evaluateeId) || "Unknown",
    }))
    return NextResponse.json({ evaluations: result })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { periodId, evaluateeId, source, id } = await request.json()

    // If an evaluation id is provided, skip enrollment check and return it directly
    if (id) {
      const existing = await getEvaluation(id)
      if (!existing || existing.evaluatorId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const { data: facultyUser } = await supabase
        .from("users")
        .select("name")
        .eq("id", existing.evaluateeId)
        .single()
      const evaluateeName = (facultyUser as { name: string } | null)?.name || "Unknown"
      return NextResponse.json({ evaluation: { ...existing, evaluateeName } }, { status: 200 })
    }

    const activeSemesterId = periodId || (await getActiveSemester())?.id
    if (!activeSemesterId) {
      return NextResponse.json({ error: "No active evaluation period" }, { status: 400 })
    }
    if (source !== "unenrolled") {
      const { data: enrollments } = await supabase
        .from("student_enrollments")
        .select("section_id, faculty_subject_id")
        .eq("student_id", userId)
        .eq("semesterId", activeSemesterId)
      let isEnrolled = false

      // Check via faculty_subject_id first (more precise)
      const directIds = (enrollments || []).filter((r) => r.faculty_subject_id).map((r) => r.faculty_subject_id)
      if (directIds.length > 0) {
        const { data: fs } = await supabase
          .from("faculty_subjects")
          .select("faculty_id")
          .in("id", directIds)
        if ((fs || []).some((r) => r.faculty_id === evaluateeId)) {
          isEnrolled = true
        }
      }

      // Fallback: check by section_id
      if (!isEnrolled) {
        const sectionIds = (enrollments || []).map((r) => r.section_id)
        if (sectionIds.length > 0) {
          const { data: fs } = await supabase
            .from("faculty_subjects")
            .select("faculty_id")
            .in("section_id", sectionIds)
            .eq("semesterId", activeSemesterId)
          if ((fs || []).some((r) => r.faculty_id === evaluateeId)) {
            isEnrolled = true
          }
        }
      }

      if (!isEnrolled) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const evaluation = await getOrCreateEvaluation(activeSemesterId, userId, evaluateeId, source)

    const { data: facultyUser } = await supabase
      .from("users")
      .select("name")
      .eq("id", evaluateeId)
      .single()
    const evaluateeName = (facultyUser as { name: string } | null)?.name || "Unknown"

    return NextResponse.json({ evaluation: { ...evaluation, evaluateeName } }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 })
  }
}
