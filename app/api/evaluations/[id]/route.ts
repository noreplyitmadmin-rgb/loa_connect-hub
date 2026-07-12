import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"
import { getEvaluation, getEvaluationRatings, getEvaluationComment } from "@/features/evaluations/evaluations.service"
import { rubricRepository } from "@/lib/repositories/factory"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const userId = (session.user as Record<string, unknown>).id as string
  const { id } = await params

  const searchParams = new URL(request.url).searchParams
  const includeRaw = searchParams.get("include") || ""
  const includes = new Set(includeRaw ? includeRaw.split(",").map((s) => s.trim()).filter(Boolean) : [])

  try {
    const evaluation = await getEvaluation(id)
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (evaluation.evaluatorId !== userId) return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (evaluation.status !== "SUBMITTED" && evaluation.status !== "DRAFT") return NextResponse.json({ error: "Not found" }, { status: 404 })
    if (evaluation.isDisabled) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const [facultyRes, fsRes] = await Promise.all([
      supabase.from("users").select("name").eq("id", evaluation.evaluateeId).single(),
      evaluation.facultySubjectId
        ? supabase.from("faculty_subjects").select("subject_id, section_id").eq("id", evaluation.facultySubjectId).single()
        : Promise.resolve({ data: null }),
    ])

    let subjectCode = ""
    let subjectName = ""
    let sectionName = ""
    if (fsRes.data?.subject_id) {
      const [subj, sec] = await Promise.all([
        supabase.from("subjects").select("code, name").eq("id", fsRes.data.subject_id).single(),
        fsRes.data.section_id
          ? supabase.from("sections").select("name").eq("id", fsRes.data.section_id).single()
          : Promise.resolve({ data: null }),
      ])
      if (subj.data) {
        subjectCode = subj.data.code
        subjectName = subj.data.name
      }
      if (sec.data) {
        sectionName = sec.data.name
      }
    }

    const responseBody: Record<string, unknown> = {
      evaluation: {
        ...evaluation,
        evaluateeName: (facultyRes.data as { name: string } | null)?.name || "Unknown",
        subjectId: fsRes.data?.subject_id || "",
        subjectCode,
        subjectName,
        sectionName,
      },
    }

    if (includes.has("ratings")) {
      const ratings = await getEvaluationRatings(id)
      responseBody.ratings = ratings
    }

    if (includes.has("comments")) {
      const comment = await getEvaluationComment(id)
      responseBody.comment = comment
    }

    if (includes.has("rubric")) {
      const rubric = await rubricRepository.getCategoriesWithItems(evaluation.evaluationPeriodId)
      responseBody.rubric = rubric
    }

    return NextResponse.json(responseBody)
  } catch (err) {
    console.error("[EVAL API ERROR]", err)
    return NextResponse.json({ error: "Failed to fetch evaluation" }, { status: 500 })
  }
}
