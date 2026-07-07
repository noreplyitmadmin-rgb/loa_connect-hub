import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { supabase } from "@/lib/db"
import { departmentRepository } from "@/lib/repositories/factory"
import {
  computeCategoryAverages,
  computeGeneralRating,
  mapCategoryAveragesToColumns,
  findHighestLowestRubrics,
  computeSentimentScore,
  getRemark,
} from "@/lib/evaluation-utils"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string }> },
) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const userId = (session.user as Record<string, unknown>).id as string
  const dept = await departmentRepository.findByDeanId(userId)
  if (!dept) return NextResponse.json({ error: "Department not found" }, { status: 404 })

  const { departmentId } = await params
  if (departmentId !== dept.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const { data: facUsers, error: fuErr } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("departmentId", departmentId)
    if (fuErr) throw fuErr
    if (!facUsers || facUsers.length === 0) return NextResponse.json({ department: null, subjects: [] })

    const facIds = facUsers.map((u) => u.id)
    const facNameMap = new Map(facUsers.map((u) => [u.id, u]))

    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId, facultySubjectId, submittedAt")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
      .in("evaluateeId", facIds)
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return NextResponse.json({ department: null, subjects: [] })

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

    const fsIds = [...new Set(evals.map((e) => e.facultySubjectId).filter(Boolean))]
    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("id, faculty_id, subject_id, section_id")
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
      const key = ev.facultySubjectId || ev.evaluateeId
      if (!groupEvalMap.has(key)) groupEvalMap.set(key, [])
      groupEvalMap.get(key)!.push(ev.id)
    }

    const subjectsList: Record<string, unknown>[] = []
    for (const [fsKey, evalIds] of groupEvalMap) {
      const fs = fsMap.get(fsKey)
      if (!fs) continue

      const user = facNameMap.get(fs.faculty_id)
      const subj = subjMap.get(fs.subject_id)

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
        facultyId: fs.faculty_id,
        facultyName: user?.name ?? "Unknown",
        facultyEmail: user?.email ?? "",
        subjectId: fs.subject_id,
        subjectCode: subj?.code ?? "",
        subjectName: subj?.name ?? "",
        totalRespondents: evalIds.length,
        avgRating: general,
        remarks: getRemark(general),
        professionalManner: catColumns.professionalManner,
        communicationWithStudent: catColumns.communicationWithStudent,
        studentEngagement: catColumns.studentEngagement,
        learningMaterials: catColumns.learningMaterials,
        timeManagement: catColumns.timeManagement,
        experientialLearning: catColumns.experientialLearning,
        respectUniqueness: catColumns.respectUniqueness,
        assessmentAndFeedback: catColumns.assessmentAndFeedback,
        highestRubrics: rubrics.highest,
        lowestRubrics: rubrics.lowest,
        sentimentScore: sentiment,
      })
    }

    const { data: dept } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("id", departmentId)
      .single()

    return NextResponse.json({
      department: dept ?? null,
      subjects: subjectsList,
    })
  } catch (e) {
    console.error("Dean department evaluation results error:", e)
    return NextResponse.json({ error: "Failed to fetch department evaluation results" }, { status: 500 })
  }
}
