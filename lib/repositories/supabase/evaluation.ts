import { supabase } from "@/lib/supabase"
import type { EvaluationData, EvaluationComment, IEvaluationRepository } from "@/lib/types"

export const evaluationRepository: IEvaluationRepository = {
  async findPending(evaluatorId, periodId) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_enrollments")
      .select("subjectId")
      .eq("studentId", evaluatorId)
      .eq("periodId", periodId)
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    const subjectIds = enrollments.map((r) => r.subjectId)
    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("facultyId")
      .eq("periodId", periodId)
      .in("subjectId", subjectIds)
    if (fsErr) throw fsErr
    const allFacultyIds = [...new Set(facultySubjects.map((r) => r.facultyId))]

    const { data: existing, error: evErr } = await supabase
      .from("evaluations")
      .select("evaluateeId")
      .eq("evaluatorId", evaluatorId)
      .eq("periodId", periodId)
    if (evErr) throw evErr
    const submittedIds = new Set(existing.map((r) => r.evaluateeId))

    return allFacultyIds.filter((id) => !submittedIds.has(id)).map((evaluateeId) => ({ evaluateeId }))
  },

  async findByEvaluator(evaluatorId) {
    const { data, error } = await supabase.from("evaluations").select("*").eq("evaluatorId", evaluatorId)
    if (error) throw error
    return data as EvaluationData[]
  },

  async findById(id) {
    const { data, error } = await supabase.from("evaluations").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async findByComposite(periodId, evaluatorId, evaluateeId) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("periodId", periodId)
      .eq("evaluatorId", evaluatorId)
      .eq("evaluateeId", evaluateeId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async create(periodId, evaluatorId, evaluateeId) {
    const { data, error } = await supabase
      .from("evaluations")
      .insert({ periodId, evaluatorId, evaluateeId })
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationData
  },

  async setRatings(evaluationId, ratings) {
    const rows = ratings.map((r) => ({ evaluationId, itemId: r.itemId, rating: r.rating }))
    const { error: delErr } = await supabase.from("evaluation_ratings").delete().eq("evaluationId", evaluationId)
    if (delErr) throw delErr
    const { error: insErr } = await supabase.from("evaluation_ratings").insert(rows)
    if (insErr) throw insErr
  },

  async submit(evaluationId) {
    const { data, error } = await supabase
      .from("evaluations")
      .update({ status: "SUBMITTED", submittedAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
      .eq("id", evaluationId)
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationData
  },

  async getRatings(evaluationId) {
    const { data, error } = await supabase
      .from("evaluation_ratings")
      .select("itemId, rating")
      .eq("evaluationId", evaluationId)
    if (error) throw error
    return data as { itemId: string; rating: number }[]
  },

  async addComment(evaluationId, comment) {
    const { data, error } = await supabase
      .from("evaluation_comments")
      .insert({ evaluationId, comment })
      .select("*")
      .single()
    if (error) throw error
    return data as EvaluationComment
  },
}
