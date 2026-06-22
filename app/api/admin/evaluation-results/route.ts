import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/route-guard"
import { supabase } from "@/lib/db"
import { evaluationResultRepository } from "@/lib/repositories/factory"

const CATEGORY_NAMES: Record<string, string> = {
  "Professional Manner": "professionalManner",
  "Communication with Students": "communicationWithStudent",
  "Student Engagement": "studentEngagement",
  "Learning Materials": "learningMaterials",
  "Time Management": "timeManagement",
  "Experiential Learning": "experientialLearning",
  "Respect for Uniqueness": "respectUniqueness",
  "Assessment and Feedback": "assessmentAndFeedback",
}

function getRemark(general: number | null): string | null {
  if (general === null) return null
  if (general >= 4.5) return "Outstanding"
  if (general >= 3.5) return "Very Satisfactory"
  if (general >= 2.5) return "Satisfactory"
  if (general >= 1.5) return "Unsatisfactory"
  return "Poor"
}

export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("periodId")
    const departmentId = searchParams.get("departmentId")
    const sourceFilter = searchParams.get("source") // "all", "unenrolled", or undefined (default: normal only)
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    let query = supabase
      .from("evaluations")
      .select("id, evaluateeId, source")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")

    if (sourceFilter === "unenrolled") {
      query = query.eq("source", "unenrolled")
    } else if (sourceFilter !== "all") {
      query = query.is("source", null)
    }

    if (departmentId) {
      const { data: deptUsers } = await supabase
        .from("users")
        .select("id")
        .eq("departmentId", departmentId)
      const ids = (deptUsers || []).map((u) => u.id)
      if (ids.length === 0) return NextResponse.json({ results: [], facultyNames: {}, uniqueRespondents: 0 })
      query = query.in("evaluateeId", ids)
    }

    const { data: evals, error: evErr } = await query
    if (evErr) throw evErr

    // Count unique respondents (distinct evaluatorIds)
    let countQuery = supabase
      .from("evaluations")
      .select("evaluatorId")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")

    if (sourceFilter === "unenrolled") {
      countQuery = countQuery.eq("source", "unenrolled")
    } else if (sourceFilter !== "all") {
      countQuery = countQuery.is("source", null)
    }

    if (departmentId) {
      const { data: deptUsers } = await supabase
        .from("users")
        .select("id")
        .eq("departmentId", departmentId)
      const ids = (deptUsers || []).map((u) => u.id)
      countQuery = countQuery.in("evaluateeId", ids)
    }

    const { data: allEvals, error: countErr } = await countQuery
    if (countErr) throw countErr
    const uniqueRespondents = new Set((allEvals || []).map((e) => e.evaluatorId)).size

    const facultyEvalMap = new Map<string, string[]>()
    const facultyUnenrolledMap = new Map<string, number>()
    for (const ev of evals || []) {
      if (!facultyEvalMap.has(ev.evaluateeId)) facultyEvalMap.set(ev.evaluateeId, [])
      facultyEvalMap.get(ev.evaluateeId)!.push(ev.id)
      if (ev.source === "unenrolled") {
        facultyUnenrolledMap.set(ev.evaluateeId, (facultyUnenrolledMap.get(ev.evaluateeId) ?? 0) + 1)
      }
    }

    const allFacultyIds = [...facultyEvalMap.keys()]
    if (allFacultyIds.length === 0) return NextResponse.json({ results: [], facultyNames: {} })

    const { data: users, error: uErr } = await supabase
      .from("users")
      .select("id, name")
      .in("id", allFacultyIds)
    if (uErr) throw uErr

    const nameMap = new Map((users || []).map((u) => [u.id, u.name]))
    const facultyNames: Record<string, string> = {}

    const results: Record<string, unknown>[] = []
    for (const [facId, evaluationIds] of facultyEvalMap) {
      facultyNames[facId] = nameMap.get(facId) || facId

      const { data: ratings, error: rErr } = await supabase
        .from("evaluation_ratings")
        .select("evaluationId, itemId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
        .in("evaluationId", evaluationIds)
      if (rErr) throw rErr

      const catRatings: Record<string, number[]> = {}
      for (const r of (ratings || []) as unknown as Array<{
        rating: number
        rubric_items: { categoryId: string; rubric_categories: { name: string } }
      }>) {
        const catName = r.rubric_items.rubric_categories.name
        if (!catRatings[catName]) catRatings[catName] = []
        catRatings[catName].push(r.rating)
      }

      const catAverages: Record<string, number> = {}
      for (const [cat, vals] of Object.entries(catRatings)) {
        catAverages[cat] = vals.reduce((a, b) => a + b, 0) / vals.length
      }

      const general = Object.keys(catAverages).length > 0
        ? Object.values(catAverages).reduce((a, b) => a + b, 0) / Object.keys(catAverages).length
        : null

      const row: Record<string, unknown> = {
        id: `${semesterId}_${facId}`,
        semesterId,
        facultyId: facId,
        departmentId: null,
        totalRespondents: evaluationIds.length,
        unenrolledCount: facultyUnenrolledMap.get(facId) ?? 0,
        generalRating: general !== null ? Math.round(general * 100) / 100 : null,
        remarks: getRemark(general),
        professionalManner: null,
        communicationWithStudent: null,
        studentEngagement: null,
        learningMaterials: null,
        timeManagement: null,
        experientialLearning: null,
        respectUniqueness: null,
        assessmentAndFeedback: null,
      }

      for (const [catName, avg] of Object.entries(catAverages)) {
        const col = CATEGORY_NAMES[catName]
        if (col) row[col] = Math.round(avg * 100) / 100
      }

      results.push(row)
    }

    const visibilityMap: Record<string, boolean> = {}
    const vis = await evaluationResultRepository.getVisibilityMap(semesterId)
    for (const r of results) {
      visibilityMap[r.facultyId as string] = vis.get(r.facultyId as string) ?? false
    }

    return NextResponse.json({ results, facultyNames, visibilityMap, uniqueRespondents })
  } catch (e) {
    console.error("Admin evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
