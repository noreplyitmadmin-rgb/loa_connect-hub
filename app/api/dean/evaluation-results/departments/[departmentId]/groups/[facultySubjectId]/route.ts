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
  { params }: { params: Promise<{ departmentId: string; facultySubjectId: string }> },
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

  const { facultySubjectId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId")
    if (!semesterId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const { data: fsData, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("id, faculty_id, subject_id, section_id")
      .eq("id", facultySubjectId)
      .single()
    if (fsErr) throw fsErr

    const { data: faculty, error: facErr } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", fsData.faculty_id)
      .single()
    if (facErr) throw facErr

    const { data: subject, error: subjErr } = await supabase
      .from("subjects")
      .select("id, code, name")
      .eq("id", fsData.subject_id)
      .single()
    if (subjErr) throw subjErr

    const { data: dept, error: deptErr } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("id", departmentId)
      .single()
    if (deptErr) throw deptErr

    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluatorId, submittedAt, createdAt")
      .eq("semesterId", semesterId)
      .eq("evaluateeId", fsData.faculty_id)
      .eq("facultySubjectId", facultySubjectId)
      .eq("status", "SUBMITTED")
      .order("submittedAt", { ascending: true })
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return NextResponse.json({ error: "No evaluations found" }, { status: 404 })

    const evaluationIds = evals.map((e) => e.id)

    const { data: ratings, error: rErr } = await supabase
      .from("evaluation_ratings")
      .select("evaluationId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
      .in("evaluationId", evaluationIds)
    if (rErr) throw rErr

    const { data: comments, error: cErr } = await supabase
      .from("evaluation_comments")
      .select("id, evaluationId, comment, sentimentLabel, sentimentScore")
      .in("evaluationId", evaluationIds)
    if (cErr) throw cErr

    const commentsByEval = new Map<string, typeof comments>()
    for (const c of comments ?? []) {
      if (!commentsByEval.has(c.evaluationId)) commentsByEval.set(c.evaluationId, [])
      commentsByEval.get(c.evaluationId)!.push(c)
    }

    const ratingsForGroup = (ratings ?? []) as unknown as Array<{
      rating: number
      rubric_items: { categoryId: string; rubric_categories: { name: string } }
    }>
    const catAverages = computeCategoryAverages(ratingsForGroup)
    const general = computeGeneralRating(catAverages)
    const catColumns = mapCategoryAveragesToColumns(catAverages)
    const rubrics = findHighestLowestRubrics(catColumns)
    const allComments = comments ?? []
    const sentiment = computeSentimentScore(allComments)

    const evaluationRows = evals.map((ev) => {
      const evalRatings = (ratings ?? []).filter((r) => r.evaluationId === ev.id) as unknown as Array<{
        rating: number
        rubric_items: { categoryId: string; rubric_categories: { name: string } }
      }>
      const evalCatAverages = computeCategoryAverages(evalRatings)
      const evalGeneral = computeGeneralRating(evalCatAverages)
      const evalCatColumns = mapCategoryAveragesToColumns(evalCatAverages)

      const evalComments = commentsByEval.get(ev.id) ?? []

      return {
        evaluationId: ev.id,
        submittedAt: ev.submittedAt,
        generalRating: evalGeneral,
        ...evalCatColumns,
        comment: evalComments.length > 0 ? evalComments[0].comment : null,
        sentimentLabel: evalComments.length > 0 ? evalComments[0].sentimentLabel : null,
        sentimentScore: evalComments.length > 0 ? evalComments[0].sentimentScore : null,
      }
    })

    return NextResponse.json({
      department: {
        id: dept.id,
        name: dept.name,
        code: dept.code,
      },
      faculty: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
      },
      subject: {
        id: subject.id,
        code: subject.code,
        name: subject.name,
      },
      summary: {
        totalRespondents: evaluationRows.length,
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
      },
      evaluations: evaluationRows,
    })
  } catch (e) {
    console.error("Dean group evaluation detail error:", e)
    return NextResponse.json({ error: "Failed to fetch evaluation detail" }, { status: 500 })
  }
}
