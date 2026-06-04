import { supabase } from "@/lib/supabase"
import type { EvaluationResultData, IEvaluationResultRepository } from "@/lib/types"

export const evaluationResultRepository: IEvaluationResultRepository = {
  async list(periodId, filters) {
    let q = supabase.from("evaluation_results").select("*").eq("periodId", periodId)
    if (filters?.departmentId) q = q.eq("departmentId", filters.departmentId)
    if (filters?.facultyId) q = q.eq("facultyId", filters.facultyId)
    const { data, error } = await q
    if (error) throw error
    return data as EvaluationResultData[]
  },

  async findByFaculty(periodId, facultyId) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .select("*")
      .eq("periodId", periodId)
      .eq("facultyId", facultyId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationResultData
  },

  async compute(periodId, facultyId) {
    const filterFaculty = facultyId ? { evaluateeId: facultyId } : {}
    const { data: evals, error: evErr } = await supabase
      .from("evaluations")
      .select("id, evaluateeId")
      .eq("periodId", periodId)
      .eq("status", "SUBMITTED")
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
        .eq("periodId", periodId)
        .eq("facultyId", facId)
        .single()
      if (exErr && exErr.code !== "PGRST116") throw exErr

      if (existing) {
        const { error: upErr } = await supabase.from("evaluation_results").update(updateData).eq("id", existing.id)
        if (upErr) throw upErr
      } else {
        const { error: insErr } = await supabase
          .from("evaluation_results")
          .insert({ periodId, facultyId: facId, ...updateData })
        if (insErr) throw insErr
      }
    }
  },

  async computeAll(periodId) {
    await this.compute(periodId)
  },
}
