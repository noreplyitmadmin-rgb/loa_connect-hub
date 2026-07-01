import { supabase } from "@/lib/db"
import type { EvaluationData, EvaluationComment, IEvaluationRepository, PendingEvaluationItem } from "@/lib/types"

export const evaluationRepository: IEvaluationRepository = {
  async findPending(evaluatorId, semesterId) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_enrollments")
      .select("faculty_subject_id, section_id")
      .eq("student_id", evaluatorId)
      .eq("semesterId", semesterId)
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    // Existing evaluations for this student+semester (excluding disabled)
    const { data: existing, error: evErr } = await supabase
      .from("evaluations")
      .select("id, facultySubjectId, evaluateeId, isDisabled")
      .eq("evaluatorId", evaluatorId)
      .eq("semesterId", semesterId)
    if (evErr) throw evErr

    const existingByFsId = new Map(existing.filter((r) => r.facultySubjectId).map((r) => [r.facultySubjectId, r]))
    const activeExistingFsIds = new Set(
      existing.filter((r) => r.facultySubjectId && !r.isDisabled).map((r) => r.facultySubjectId),
    )

    const directIds = enrollments.filter((r) => r.faculty_subject_id).map((r) => r.faculty_subject_id)

    if (directIds.length > 0) {
      const { data: facultySubjects, error: fsErr } = await supabase
        .from("faculty_subjects")
        .select("id, faculty_id, subject_id")
        .in("id", directIds)
      if (fsErr) throw fsErr

      const staleIds: string[] = []

      for (const fs of facultySubjects) {
        const ev = existingByFsId.get(fs.id)
        if (ev && ev.evaluateeId !== fs.faculty_id && !ev.isDisabled) {
          staleIds.push(ev.id)
        }
      }

      if (staleIds.length > 0) {
        await supabase.from("evaluations").update({ isDisabled: true }).in("id", staleIds)
        for (const id of staleIds) activeExistingFsIds.delete(existingByFsId.get(id)!.facultySubjectId)
      }

      return facultySubjects
        .filter((fs) => !activeExistingFsIds.has(fs.id))
        .map(
          (fs): PendingEvaluationItem => ({
            evaluateeId: fs.faculty_id,
            facultySubjectId: fs.id,
            subjectId: fs.subject_id,
          }),
        )
    }

    // Fallback: no faculty_subject_id in enrollments — scope by section
    const sectionIds = enrollments.map((r) => r.section_id)
    const { data: facultySubjects, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("id, faculty_id, subject_id")
      .in("section_id", sectionIds)
      .eq("semesterId", semesterId)
    if (fsErr) throw fsErr

    const staleIds: string[] = []

    for (const fs of facultySubjects) {
      const ev = existingByFsId.get(fs.id)
      if (ev && ev.evaluateeId !== fs.faculty_id && !ev.isDisabled) {
        staleIds.push(ev.id)
      }
    }

    if (staleIds.length > 0) {
      await supabase.from("evaluations").update({ isDisabled: true }).in("id", staleIds)
      for (const id of staleIds) activeExistingFsIds.delete(existingByFsId.get(id)!.facultySubjectId)
    }

    return facultySubjects
      .filter((fs) => !activeExistingFsIds.has(fs.id))
      .map(
        (fs): PendingEvaluationItem => ({
          evaluateeId: fs.faculty_id,
          facultySubjectId: fs.id,
          subjectId: fs.subject_id,
        }),
      )
  },

  async findByEvaluator(evaluatorId) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("evaluatorId", evaluatorId)
      .order("createdAt", { ascending: false })
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

  async findByComposite(semesterId, evaluatorId, facultySubjectId) {
    const { data, error } = await supabase
      .from("evaluations")
      .select("*")
      .eq("semesterId", semesterId)
      .eq("evaluatorId", evaluatorId)
      .eq("facultySubjectId", facultySubjectId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationData
  },

  async create(semesterId, evaluatorId, evaluateeId, facultySubjectId, source) {
    const { data, error } = await supabase
      .from("evaluations")
      .insert({ semesterId, evaluatorId, evaluateeId, facultySubjectId, source: source ?? null })
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
