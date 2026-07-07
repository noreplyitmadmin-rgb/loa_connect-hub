import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
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
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    // Get all submitted evaluations for this period
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId, facultySubjectId, submittedAt")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return NextResponse.json({ departments: [] })

    const evaluationIds = evals.map((e) => e.id)
    const facultyIds = [...new Set(evals.map((e) => e.evaluateeId))]

    // Get faculty department info
    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, name, email, departmentId")
      .in("id", facultyIds)
    if (uErr) throw uErr
    const userMap = new Map(users?.map((u) => [u.id, u]) ?? [])

    // Get department names
    const deptIds = [...new Set((users ?? []).map((u) => u.departmentId).filter(Boolean))]
    const { data: deptRows, error: dErr } = await supabase
      .from("departments")
      .select("id, name, code")
      .in("id", deptIds)
    if (dErr) throw dErr
    const deptMap = new Map(deptRows?.map((d) => [d.id, d]) ?? [])

    // Get ratings for all evaluations
    const { data: ratings, error: rErr } = await supabase
      .from("evaluation_ratings")
      .select("evaluationId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
      .in("evaluationId", evaluationIds)
    if (rErr) throw rErr

    // Get comments for all evaluations
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

    // Group evaluations by faculty
    const facultyEvalMap = new Map<string, string[]>()
    for (const ev of evals) {
      if (!facultyEvalMap.has(ev.evaluateeId)) facultyEvalMap.set(ev.evaluateeId, [])
      facultyEvalMap.get(ev.evaluateeId)!.push(ev.id)
    }

    // Compute per-faculty results
    const facultyResults: Record<string, {
      generalRating: number | null
      catColumns: Record<string, number | null>
      respondentCount: number
      sentimentScore: number | null
      facultySubjectIds: string[]
      remarks: string | null
    }> = {}

    for (const [facId, evalIds] of facultyEvalMap) {
      const facRatings = (ratings ?? []).filter((r) => evalIds.includes(r.evaluationId as string)) as unknown as Array<{
        rating: number
        rubric_items: { categoryId: string; rubric_categories: { name: string } }
      }>
      const catAverages = computeCategoryAverages(facRatings)
      const general = computeGeneralRating(catAverages)
      const catColumns = mapCategoryAveragesToColumns(catAverages)

      const facComments = evalIds.flatMap((eid) => commentsByEval.get(eid) ?? [])
      const sentiment = computeSentimentScore(facComments)

      const facEvals = evals.filter((e) => e.evaluateeId === facId)
      const fsIds = [...new Set(facEvals.map((e) => e.facultySubjectId).filter(Boolean))]

      facultyResults[facId] = {
        generalRating: general,
        catColumns,
        respondentCount: evalIds.length,
        sentimentScore: sentiment,
        facultySubjectIds: fsIds,
        remarks: getRemark(general),
      }
    }

    // Aggregate by department
    const deptAggs = new Map<string, {
      departmentId: string
      departmentName: string
      departmentCode: string
      facultyCount: number
      totalRespondents: number
      generalRatings: number[]
      catSums: Record<string, number[]>
      sentimentScores: number[]
    }>()

    for (const [facId, result] of Object.entries(facultyResults)) {
      const user = userMap.get(facId)
      const deptId = user?.departmentId ?? "__unknown__"
      if (!deptAggs.has(deptId)) {
        const dept = deptMap.get(deptId)
        deptAggs.set(deptId, {
          departmentId: deptId,
          departmentName: dept?.name ?? "Unknown",
          departmentCode: dept?.code ?? "",
          facultyCount: 0,
          totalRespondents: 0,
          generalRatings: [],
          catSums: {
            professionalManner: [],
            communicationWithStudent: [],
            studentEngagement: [],
            learningMaterials: [],
            timeManagement: [],
            experientialLearning: [],
            respectUniqueness: [],
            assessmentAndFeedback: [],
          },
          sentimentScores: [],
        })
      }
      const agg = deptAggs.get(deptId)!
      agg.facultyCount++
      agg.totalRespondents += result.respondentCount
      if (result.generalRating !== null) agg.generalRatings.push(result.generalRating)
      for (const [key, val] of Object.entries(result.catColumns)) {
        if (val !== null) agg.catSums[key]?.push(val)
      }
      if (result.sentimentScore !== null) agg.sentimentScores.push(result.sentimentScore)
    }

    const departments = Array.from(deptAggs.values())
      .filter((d) => d.departmentId !== "__unknown__")
      .map((agg) => {
        const avgDeptRating = agg.generalRatings.length > 0
          ? Math.round(agg.generalRatings.reduce((a, b) => a + b, 0) / agg.generalRatings.length * 100) / 100
          : null

        const deptCatAverages: Record<string, number | null> = {}
        for (const key of Object.keys(agg.catSums)) {
          const vals = agg.catSums[key]
          deptCatAverages[key] = vals.length > 0
            ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100
            : null
        }

        const rubrics = findHighestLowestRubrics(deptCatAverages)
        const avgSentiment = agg.sentimentScores.length > 0
          ? Math.round(agg.sentimentScores.reduce((a, b) => a + b, 0) / agg.sentimentScores.length * 100) / 100
          : null

        return {
          departmentId: agg.departmentId,
          departmentName: agg.departmentName,
          departmentCode: agg.departmentCode,
          facultyCount: agg.facultyCount,
          totalRespondents: agg.totalRespondents,
          avgRating: avgDeptRating,
          remarks: getRemark(avgDeptRating),
          highestRubrics: rubrics.highest,
          lowestRubrics: rubrics.lowest,
          sentimentScore: avgSentiment,
        }
      })

    return NextResponse.json({ departments })
  } catch (e) {
    console.error("Admin evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
