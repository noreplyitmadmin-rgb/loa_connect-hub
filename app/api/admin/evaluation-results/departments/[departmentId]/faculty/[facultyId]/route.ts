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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ departmentId: string; facultyId: string }> },
) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const { departmentId, facultyId } = await params

  try {
    const { searchParams } = new URL(request.url)
    const evaluationPeriodId = searchParams.get("evaluationPeriodId") || searchParams.get("semesterId")
    if (!evaluationPeriodId) return NextResponse.json({ error: "evaluationPeriodId is required" }, { status: 400 })

    // Get faculty info
    const { data: faculty, error: facErr } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("id", facultyId)
      .single()
    if (facErr) throw facErr

    // Get department info
    const { data: dept, error: deptErr } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("id", departmentId)
      .single()
    if (deptErr) throw deptErr

    // Get all faculty_subjects for this faculty in this department
    const { data: fsList, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select(`
        id, subject_id,
        subjects!inner(id, code, name),
        sections!inner(departmentCourseId)
      `)
      .eq("faculty_id", facultyId)
    if (fsErr) throw fsErr

    if (!fsList || fsList.length === 0) {
      return NextResponse.json({ error: "No subjects found for this faculty" }, { status: 404 })
    }

    const facultySubjectIds = fsList.map((fs) => fs.id)

    // Get all evaluations for this faculty across all subjects
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluatorId, submittedAt, createdAt, facultySubjectId")
      .eq("evaluation_period_id", evaluationPeriodId)
      .eq("evaluateeId", facultyId)
      .in("facultySubjectId", facultySubjectIds)
      .eq("status", "SUBMITTED")
      .order("submittedAt", { ascending: true })
    if (evErr) throw evErr
    if (!evals || evals.length === 0) {
      return NextResponse.json({ error: "No evaluations found for this faculty" }, { status: 404 })
    }

    const evaluationIds = evals.map((e) => e.id)

    // Get all ratings
    const { data: ratings, error: rErr } = await supabase
      .from("evaluation_ratings")
      .select("evaluationId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
      .in("evaluationId", evaluationIds)
    if (rErr) throw rErr

    // Get all comments
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

    // Compute aggregate
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

    // Build per-evaluation rows
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

    // Collect unique subject codes for display
    const subjectCodes = [...new Set(fsList.map((fs) => (fs.subjects as unknown as { code: string })?.code).filter(Boolean))]

    return NextResponse.json({
      faculty: { id: faculty.id, name: faculty.name, email: faculty.email },
      department: { id: dept.id, name: dept.name, code: dept.code },
      subject: {
        code: subjectCodes.join(", ") || "Multiple Subjects",
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
    console.error("Consolidated faculty evaluation error:", e)
    return NextResponse.json({ error: "Failed to fetch consolidated evaluation" }, { status: 500 })
  }
}
