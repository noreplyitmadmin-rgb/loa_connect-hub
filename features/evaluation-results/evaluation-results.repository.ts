import { supabase } from "@/lib/db"
import type { EvaluationResultData, IEvaluationResultRepository, StudentBreakdownItem, FacultyEvalDetail } from "@/lib/types"

export const evaluationResultRepository: IEvaluationResultRepository = {
  async list(semesterId, filters) {
    let q = supabase.from("evaluation_results").select("*").eq("semesterId", semesterId)
    if (filters?.departmentId) q = q.eq("departmentId", filters.departmentId)
    if (filters?.facultyId) q = q.eq("facultyId", filters.facultyId)
    const { data, error } = await q
    if (error) throw error
    return data as EvaluationResultData[]
  },

  async findByFaculty(semesterId, facultyId) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .select("*")
      .eq("semesterId", semesterId)
      .eq("facultyId", facultyId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationResultData
  },

  async compute(semesterId, facultyId) {
    const filterFaculty = facultyId ? { evaluateeId: facultyId } : {}
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId, facultySubjectId")
      .eq("semesterId", semesterId)
      .eq("status", "SUBMITTED")
      .eq("isDisabled", false)
      .not("facultySubjectId", "is", null)
      .match(filterFaculty)
    if (evErr) throw evErr
    if (!evals || evals.length === 0) return

    const grouped = new Map<string, string[]>()
    for (const ev of evals) {
      if (!grouped.has(ev.evaluateeId)) grouped.set(ev.evaluateeId, [])
      grouped.get(ev.evaluateeId)!.push(ev.id)
    }

    for (const [facId, evaluationIds] of grouped) {
      if (evaluationIds.length === 0) continue

      const { data: ratings, error: rErr } = await supabase
        .from("evaluation_ratings")
        .select("evaluationId, itemId, rating, rubric_items!inner(categoryId, rubric_categories!inner(name))")
        .in("evaluationId", evaluationIds)
      if (rErr) throw rErr

      const catRatings: Record<string, number[]> = {}
      for (const r of ratings as unknown as Array<{ rating: number; rubric_items: { categoryId: string; rubric_categories: { name: string } } }>) {
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

      let remarks: string | null = null
      if (general !== null) {
        if (general >= 4.5) remarks = "Outstanding"
        else if (general >= 3.5) remarks = "Very Satisfactory"
        else if (general >= 2.5) remarks = "Satisfactory"
        else if (general >= 1.5) remarks = "Unsatisfactory"
        else remarks = "Poor"
      }

      const { data: userRow, error: uErr } = await supabase
        .from("users")
        .select("departmentId")
        .eq("id", facId)
        .single()
      if (uErr) throw uErr

      const updateData: Record<string, unknown> = {
        totalRespondents: evaluationIds.length,
        generalRating: general ? Math.round(general * 100) / 100 : null,
        remarks,
        departmentId: userRow?.departmentId ?? null,
        computedAt: new Date().toISOString(),
      }

      const nameToColumn: Record<string, string> = {
        "Professional Manner": "professionalManner",
        "Communication with Students": "communicationWithStudent",
        "Student Engagement": "studentEngagement",
        "Learning Materials": "learningMaterials",
        "Time Management": "timeManagement",
        "Experiential Learning": "experientialLearning",
        "Respect for Uniqueness": "respectUniqueness",
        "Assessment and Feedback": "assessmentAndFeedback",
      }

      for (const [catName, avg] of Object.entries(catAverages)) {
        const col = nameToColumn[catName]
        if (col) {
          updateData[col] = Math.round(avg * 100) / 100
        }
      }

      const { data: existing, error: exErr } = await supabase
        .from("evaluation_results")
        .select("id")
        .eq("semesterId", semesterId)
        .eq("facultyId", facId)
        .single()
      if (exErr && exErr.code !== "PGRST116") throw exErr

      if (existing) {
        const { error: upErr } = await supabase.from("evaluation_results").update(updateData).eq("id", existing.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from("evaluation_results")
          .insert({ semesterId, facultyId: facId, ...updateData })
        if (insErr) throw insErr
      }
    }
  },

  async computeAll(semesterId) {
    await this.compute(semesterId)
  },

  async setVisibility(semesterId, facultyIds, visible) {
    const { data: existing } = await supabase
      .from("evaluation_results")
      .select("facultyId")
      .eq("semesterId", semesterId)
      .in("facultyId", facultyIds)

    const existingSet = new Set((existing || []).map((r) => r.facultyId))
    const toUpdate = facultyIds.filter((id) => existingSet.has(id))
    const toInsert = facultyIds.filter((id) => !existingSet.has(id))

    if (toUpdate.length > 0) {
      const { error } = await supabase
        .from("evaluation_results")
        .update({ is_results_visible: visible })
        .eq("semesterId", semesterId)
        .in("facultyId", toUpdate)
      if (error) throw error
    }

    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("evaluation_results")
        .insert(toInsert.map((facultyId) => ({
          semesterId,
          facultyId,
          is_results_visible: visible,
          totalRespondents: 0,
        })))
      if (error) throw error
    }
  },

  async getVisibilityMap(semesterId) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .select("facultyId, is_results_visible")
      .eq("semesterId", semesterId)
    if (error) throw error
    return new Map((data || []).map((r) => [r.facultyId, r.is_results_visible]))
  },
}

const nameToColumn: Record<string, keyof StudentBreakdownItem> = {
  "Professional Manner": "professionalManner",
  "Communication with Students": "communicationWithStudent",
  "Student Engagement": "studentEngagement",
  "Learning Materials": "learningMaterials",
  "Time Management": "timeManagement",
  "Experiential Learning": "experientialLearning",
  "Respect for Uniqueness": "respectUniqueness",
  "Assessment and Feedback": "assessmentAndFeedback",
}

export async function getStudentBreakdownsForFaculty(
  semesterId: string,
  facultyId: string,
): Promise<StudentBreakdownItem[]> {
  const { data: evals, error: evErr } = await supabase
    .from("evaluations")
    .select(`
      id,
      evaluation_ratings(
        rating,
        rubric_items!inner(
          categoryId,
          rubric_categories!inner(name)
        )
      ),
      evaluation_comments(comment, sentimentLabel, sentimentScore)
    `)
    .eq("semesterId", semesterId)
    .eq("evaluateeId", facultyId)
    .eq("status", "SUBMITTED")
    .eq("isDisabled", false)
    .not("facultySubjectId", "is", null)
  if (evErr) throw evErr
  if (!evals || evals.length === 0) return []

  return evals.map((ev: Record<string, unknown>) => {
    const ratings = (ev.evaluation_ratings || []) as Array<{
      rating: number
      rubric_items: { categoryId: string; rubric_categories: { name: string } }
    }>
    const comments = (ev.evaluation_comments || []) as Array<{ comment: string; sentimentLabel: string | null; sentimentScore: number | null }>

    const catScores: Record<string, number[]> = {}
    for (const r of ratings) {
      const catName = r.rubric_items.rubric_categories.name
      if (!catScores[catName]) catScores[catName] = []
      catScores[catName].push(r.rating)
    }

    const item: StudentBreakdownItem = {
      professionalManner: null,
      communicationWithStudent: null,
      studentEngagement: null,
      learningMaterials: null,
      timeManagement: null,
      experientialLearning: null,
      respectUniqueness: null,
      assessmentAndFeedback: null,
      generalRating: null,
      comment: comments.length > 0 ? comments[0].comment : null,
      sentimentLabel: comments.length > 0 ? comments[0].sentimentLabel : null,
      sentimentScore: comments.length > 0 ? comments[0].sentimentScore : null,
    }

    let catAvgSum = 0
    let catCount = 0
    for (const [catName, vals] of Object.entries(catScores)) {
      const avg = vals.reduce((a, b) => a + b, 0) / vals.length
      const col = nameToColumn[catName]
      if (col) {
        ;(item as unknown as Record<string, unknown>)[col] = Math.round(avg * 100) / 100
        catAvgSum += avg
        catCount++
      }
    }
    if (catCount > 0) {
      item.generalRating = Math.round((catAvgSum / catCount) * 100) / 100
    }

    return item
  })
}

export async function getDeanDetails(
  semesterId: string,
  departmentId: string,
): Promise<FacultyEvalDetail[]> {
  const { data: results, error: resErr } = await supabase
    .from("evaluation_results")
    .select("*")
    .eq("semesterId", semesterId)
    .eq("departmentId", departmentId)
  if (resErr) throw resErr
  if (!results || results.length === 0) return []

  const facultyIds = results.map((r) => r.facultyId)

  const { data: users, error: uErr } = await supabase
    .from("users")
    .select("id, name")
    .in("id", facultyIds)
  if (uErr) throw uErr
  const nameMap = new Map((users || []).map((u) => [u.id, u.name]))

  const details: FacultyEvalDetail[] = []
  for (const r of results) {
    const students = await getStudentBreakdownsForFaculty(semesterId, r.facultyId)
    details.push({
      facultyId: r.facultyId,
      facultyName: nameMap.get(r.facultyId) || r.facultyId,
      totalRespondents: r.totalRespondents,
      generalRating: r.generalRating,
      remarks: r.remarks,
      professionalManner: r.professionalManner,
      communicationWithStudent: r.communicationWithStudent,
      studentEngagement: r.studentEngagement,
      learningMaterials: r.learningMaterials,
      timeManagement: r.timeManagement,
      experientialLearning: r.experientialLearning,
      respectUniqueness: r.respectUniqueness,
      assessmentAndFeedback: r.assessmentAndFeedback,
      students,
    })
  }
  return details
}
