import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { supabase } from "@/lib/db"
import {
  computeCategoryAverages,
  computeGeneralRating,
  mapCategoryAveragesToColumns,
  findHighestLowestRubrics,
  computeSentimentScore,
  getRemark,
} from "@/lib/evaluation-utils"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const userId = (session.user as Record<string, unknown>).id as string

  try {
    const { searchParams } = new URL(request.url)
    const evaluationPeriodId = searchParams.get("evaluationPeriodId") || searchParams.get("semesterId")
    if (!evaluationPeriodId) return NextResponse.json({ error: "evaluationPeriodId is required" }, { status: 400 })

    const { data: visRow } = await supabase
      .from("evaluation_results")
      .select("is_results_visible")
      .eq("evaluation_period_id", evaluationPeriodId)
      .eq("facultyId", userId)
      .maybeSingle()
    if (!visRow || !visRow.is_results_visible) {
      return NextResponse.json({ error: "Evaluation results are not visible yet" }, { status: 403 })
    }

    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, facultySubjectId, submittedAt")
      .eq("evaluation_period_id", evaluationPeriodId)
      .eq("evaluateeId", userId)
      .eq("status", "SUBMITTED")
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return NextResponse.json({ subjects: [] })

    const evaluationIds = evals.map((e) => e.id)
    const fsIds = [...new Set(evals.map((e) => e.facultySubjectId).filter(Boolean))]

    const { data: ratings, error: rErr } = await supabase
      .from("evaluation_ratings")
      .select("evaluationId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
      .in("evaluationId", evaluationIds)
    if (rErr) throw rErr

    const { data: comments, error: cErr } = await supabase
      .from("evaluation_comments")
      .select("evaluationId, sentimentScore")
      .in("evaluationId", evaluationIds)
    if (cErr) throw cErr
    const commentsByEval = new Map<string, { sentimentScore: number | null }[]>()
    for (const c of comments ?? []) {
      if (!commentsByEval.has(c.evaluationId)) commentsByEval.set(c.evaluationId, [])
      commentsByEval.get(c.evaluationId)!.push(c)
    }

    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("id, subject_id, section_id")
      .in("id", fsIds)
    if (fsErr) throw fsErr
    const fsMap = new Map(facultySubjects?.map((fs) => [fs.id, fs]) ?? [])

    const subjIds = [...new Set(facultySubjects?.map((fs) => fs.subject_id) ?? [])]
    const { data: subjects, error: sErr } = await supabase
      .from("subjects")
      .select("id, code, name")
      .in("id", subjIds)
    if (sErr) throw sErr
    const subjMap = new Map(subjects?.map((s) => [s.id, s]) ?? [])

    const groupEvalMap = new Map<string, string[]>()
    for (const ev of evals) {
      const key = ev.facultySubjectId || ev.id
      if (!groupEvalMap.has(key)) groupEvalMap.set(key, [])
      groupEvalMap.get(key)!.push(ev.id)
    }

    const subjectsList: Record<string, unknown>[] = []
    for (const [fsKey, evalIds] of groupEvalMap) {
      const fs = fsMap.get(fsKey)
      const subj = fs ? subjMap.get(fs.subject_id) : null

      const groupRatings = (ratings ?? []).filter((r) => evalIds.includes(r.evaluationId as string)) as unknown as Array<{
        rating: number
        rubric_items: { categoryId: string; rubric_categories: { name: string } }
      }>
      const catAverages = computeCategoryAverages(groupRatings)
      const general = computeGeneralRating(catAverages)
      const catColumns = mapCategoryAveragesToColumns(catAverages)
      const rubrics = findHighestLowestRubrics(catColumns)

      const groupComments = evalIds.flatMap((eid) => commentsByEval.get(eid) ?? [])
      const sentiment = computeSentimentScore(groupComments)

      subjectsList.push({
        facultySubjectId: fsKey,
        subjectCode: subj?.code ?? "",
        subjectName: subj?.name ?? "",
        totalRespondents: evalIds.length,
        avgRating: general,
        remarks: getRemark(general),
        highestRubrics: rubrics.highest,
        lowestRubrics: rubrics.lowest,
        sentimentScore: sentiment,
      })
    }

    return NextResponse.json({ subjects: subjectsList })
  } catch (e) {
    console.error("Faculty subjects evaluation error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
