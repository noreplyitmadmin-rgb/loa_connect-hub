import { supabase } from "@/lib/db"
import type { EvaluationData, EvaluationComment, IEvaluationRepository } from "@/lib/types"

export const evaluationRepository: IEvaluationRepository = {
  async findPending(evaluatorId, semesterId) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_enrollments")
      .select("section_id, faculty_subject_id")
      .eq("student_id", evaluatorId)
      .eq("semesterId", semesterId)
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    // If any enrollment has a specific faculty_subject_id, use it directly
    const directFacultyIds = enrollments
      .filter((r) => r.faculty_subject_id)
      .map((r) => r.faculty_subject_id)
    if (directFacultyIds.length > 0) {
      const { data: facultySubjects, error: fsErr } = await supabase
        .from("faculty_subjects")
        .select("faculty_id")
        .in("id", directFacultyIds)
      if (fsErr) throw fsErr
      const allFacultyIds = [...new Set(facultySubjects.map((r) => r.faculty_id))]

      const { data: existing, error: evErr } = await supabase
        .from("evaluations")
        .select("evaluateeId")
        .eq("evaluatorId", evaluatorId)
        .eq("semesterId", semesterId)
      if (evErr) throw evErr
      const submittedIds = new Set(existing.map((r) => r.evaluateeId))

      return allFacultyIds.filter((id) => !submittedIds.has(id)).map((evaluateeId) => ({ evaluateeId }))
    }

    // Fallback: no faculty_subject_id — scope by section
    const sectionIds = enrollments.map((r) => r.section_id)
    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("faculty_id")
      .in("section_id", sectionIds)
      .eq("semesterId", semesterId)
    if (fsErr) throw fsErr
    const allFacultyIds = [...new Set(facultySubjects.map((r) => r.faculty_id))]

    const { data: existing, error: evErr } = await supabase
      .from("evaluations")
      .select("evaluateeId")
      .eq("evaluatorId", evaluatorId)
      .eq("semesterId", semesterId)
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

  async findByComposite(semesterId, evaluatorId, evaluateeId) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("semesterId", semesterId)
      .eq("evaluatorId", evaluatorId)
      .eq("evaluateeId", evaluateeId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async create(semesterId, evaluatorId, evaluateeId, source) {
    const { data, error } = await supabase
      .from("evaluations")
      .insert({ semesterId, evaluatorId, evaluateeId, source: source ?? null })
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

  async getComment(evaluationId) {
    const { data, error } = await supabase
      .from("evaluation_comments")
      .select("*")
      .eq("evaluationId", evaluationId)
      .maybeSingle()
    if (error) throw error
    return data as EvaluationComment | null
  },
}
