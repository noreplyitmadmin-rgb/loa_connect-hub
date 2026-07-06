import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/supabase"
import { getOrCreateEvaluation, getEvaluation, getMyEvaluations } from "@/features/evaluations/evaluations.service"
import { getActiveSemester } from "@/features/admin-data/semesters.service"
import type { EvaluationData } from "@/lib/types"

async function enrichEvaluation(evaluation: EvaluationData) {
  const [facultyRes, subjectRes] = await Promise.all([
    supabase.from("users").select("name").eq("id", evaluation.evaluateeId).single(),
    evaluation.facultySubjectId
      ? supabase
          .from("faculty_subjects")
          .select("subject_id")
          .eq("id", evaluation.facultySubjectId)
          .single()
      : Promise.resolve({ data: null }),
  ])

  let subjectName = ""
  let subjectCode = ""
  if (subjectRes.data?.subject_id) {
    const { data: subj } = await supabase
      .from("subjects")
      .select("code, name")
      .eq("id", subjectRes.data.subject_id)
      .single()
    if (subj) {
      subjectCode = subj.code
      subjectName = subj.name
    }
  }

  return {
    ...evaluation,
    evaluateeName: (facultyRes.data as { name: string } | null)?.name || "Unknown",
    subjectId: subjectRes.data?.subject_id || "",
    subjectCode,
    subjectName,
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const activeSemester = await getActiveSemester()
    const evaluations = await getMyEvaluations(userId, activeSemester?.id)
    const result = await Promise.all(evaluations.map(enrichEvaluation))
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
    const { periodId, evaluateeId, facultySubjectId, source, id } = await request.json()

    // If an evaluation id is provided, skip enrollment check and return it directly
    if (id) {
      const existing = await getEvaluation(id)
      if (!existing || existing.evaluatorId !== userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      const enriched = await enrichEvaluation(existing)
      return NextResponse.json({ evaluation: enriched }, { status: 200 })
    }

    const activeSemesterId = periodId || (await getActiveSemester())?.id
    if (!activeSemesterId) {
      return NextResponse.json({ error: "No active evaluation period" }, { status: 400 })
    }

    if (source !== "unenrolled") {
      // Validate that the facultySubjectId belongs to one of the student's enrollments
      const { data: enrollment } = await supabase
        .from("student_enrollments")
        .select("id")
        .eq("student_id", userId)
        .eq("faculty_subject_id", facultySubjectId)
        .eq("semesterId", activeSemesterId)
        .maybeSingle()

      if (!enrollment) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const fsId = facultySubjectId || null
    const evaluation = await getOrCreateEvaluation(activeSemesterId, userId, evaluateeId, fsId, source)
    const enriched = await enrichEvaluation(evaluation)

    return NextResponse.json({ evaluation: enriched }, { status: 200 })
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 })
  }
}
