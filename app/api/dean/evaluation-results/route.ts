import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/db"
import { departmentRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    const userId = (session.user as Record<string, unknown>).id as string
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const dept = await departmentRepository.findByDeanId(userId)
    if (!dept) return NextResponse.json({ departments: [] })

    // Forward to a shared handler using the same logic
    const url = new URL(request.url)
    url.pathname = `/api/admin/evaluation-results`
    // The actual fetching is done via supabase directly, so let's inline the logic
    // but filtered to this department

    const { data: facUsers, error: fuErr } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("departmentId", dept.id)
    if (fuErr) throw fuErr
    if (!facUsers || facUsers.length === 0) return NextResponse.json({ departments: [] })

    const facIds = facUsers.map((u) => u.id)

    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId, facultySubjectId, submittedAt")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
      .in("evaluateeId", facIds)
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return NextResponse.json({ departments: [] })

    const evaluationIds = evals.map((e) => e.id)

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

    // Same aggregation as admin but for single department
    const CATEGORY_NAMES_MAP: Record<string, string> = {
      "Professional Manner": "professionalManner",
      "Communication with Students": "communicationWithStudent",
      "Student Engagement": "studentEngagement",
      "Learning Materials": "learningMaterials",
      "Time Management": "timeManagement",
      "Experiential Learning": "experientialLearning",
      "Respect for Uniqueness": "respectUniqueness",
      "Assessment and Feedback": "assessmentAndFeedback",
    }

    const CATEGORY_LABELS_MAP: Record<string, string> = {
      professionalManner: "Professional Manner",
      communicationWithStudent: "Communication w/ Students",
      studentEngagement: "Student Engagement",
      learningMaterials: "Learning Materials",
      timeManagement: "Time Management",
      experientialLearning: "Experiential Learning",
      respectUniqueness: "Respect for Uniqueness",
      assessmentAndFeedback: "Assessment & Feedback",
    }

    function computeCatAvg(ratings: Array<{ rating: number; rubric_items: { categoryId: string; rubric_categories: { name: string } } }>): Record<string, number> {
      const groups: Record<string, number[]> = {}
      for (const r of ratings) {
        const n = r.rubric_items.rubric_categories.name
        if (!groups[n]) groups[n] = []
        groups[n].push(r.rating)
      }
      const avgs: Record<string, number> = {}
      for (const [k, v] of Object.entries(groups)) avgs[k] = v.reduce((a, b) => a + b, 0) / v.length
      return avgs
    }

    function getRemark(g: number | null): string | null {
      if (g === null) return null
      if (g >= 4.5) return "Outstanding"
      if (g >= 3.5) return "Very Satisfactory"
      if (g >= 2.5) return "Satisfactory"
      if (g >= 1.5) return "Unsatisfactory"
      return "Poor"
    }

    const facEvalMap = new Map<string, string[]>()
    for (const ev of evals) {
      if (!facEvalMap.has(ev.evaluateeId)) facEvalMap.set(ev.evaluateeId, [])
      facEvalMap.get(ev.evaluateeId)!.push(ev.id)
    }

    const catSums: Record<string, number[]> = {
      professionalManner: [], communicationWithStudent: [], studentEngagement: [],
      learningMaterials: [], timeManagement: [], experientialLearning: [],
      respectUniqueness: [], assessmentAndFeedback: [],
    }
    let facultyCount = 0
    let totalRespondents = 0
    const generalRatings: number[] = []
    const sentimentScores: number[] = []

    for (const [facId, evalIds] of facEvalMap) {
      facultyCount++
      totalRespondents += evalIds.length

      const facRatings = (ratings ?? []).filter((r) => evalIds.includes(r.evaluationId as string)) as unknown as Array<{
        rating: number
        rubric_items: { categoryId: string; rubric_categories: { name: string } }
      }>
      const ca = computeCatAvg(facRatings)
      const gen = Object.keys(ca).length > 0
        ? Object.values(ca).reduce((a, b) => a + b, 0) / Object.keys(ca).length
        : null
      if (gen !== null) generalRatings.push(Math.round(gen * 100) / 100)

      for (const [catName, avg] of Object.entries(ca)) {
        const col = CATEGORY_NAMES_MAP[catName]
        if (col && catSums[col]) catSums[col].push(avg)
      }

      const facComments = evalIds.flatMap((eid) => commentsByEval.get(eid) ?? [])
      const scored = facComments.filter((c) => c.sentimentScore !== null).map((c) => c.sentimentScore as number)
      if (scored.length > 0) sentimentScores.push(scored.reduce((a, b) => a + b, 0) / scored.length)
    }

    const avgDeptRating = generalRatings.length > 0
      ? Math.round(generalRatings.reduce((a, b) => a + b, 0) / generalRatings.length * 100) / 100
      : null

    const deptCatAverages: Record<string, number | null> = {}
    for (const key of Object.keys(catSums)) {
      const vals = catSums[key]
      deptCatAverages[key] = vals.length > 0
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100
        : null
    }

    const highest: { key: string; label: string; score: number }[] = []
    const lowest: { key: string; label: string; score: number }[] = []
    const entries = Object.entries(deptCatAverages)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => ({ key: k, label: CATEGORY_LABELS_MAP[k] || k, score: v as number }))
    if (entries.length > 0) {
      const maxS = Math.max(...entries.map((e) => e.score))
      const minS = Math.min(...entries.map((e) => e.score))
      highest.push(...entries.filter((e) => e.score === maxS))
      lowest.push(...entries.filter((e) => e.score === minS))
    }

    const avgSentiment = sentimentScores.length > 0
      ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length * 100) / 100
      : null

    return NextResponse.json({
      departments: [{
        departmentId: dept.id,
        departmentName: dept.name,
        departmentCode: dept.code ?? "",
        facultyCount,
        totalRespondents,
        avgRating: avgDeptRating,
        remarks: getRemark(avgDeptRating),
        highestRubrics: highest,
        lowestRubrics: lowest,
        sentimentScore: avgSentiment,
      }],
    })
  } catch (e) {
    console.error("Dean evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
