import { supabase } from "@/lib/supabase"
import type { FacultySubjectData, IFacultySubjectRepository } from "@/lib/types"

export const facultySubjectRepository: IFacultySubjectRepository = {
  async list(periodId, facultyId) {
    let q = supabase.from("faculty_subjects").select("*")
    if (periodId) {
      q = q.eq("periodId", periodId)
    } else {
      q = q.is("periodId", null)
    }
    if (facultyId) q = q.eq("facultyId", facultyId)
    const { data, error } = await q
    if (error) throw error
    return data as FacultySubjectData[]
  },

  async replaceAll(periodId, items) {
    let delQ = supabase.from("faculty_subjects").delete()
    if (periodId) {
      delQ = delQ.eq("periodId", periodId)
    } else {
      delQ = delQ.is("periodId", null)
    }
    const { error: delErr } = await delQ
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ ...i, periodId }))
    const { error: insErr } = await supabase.from("faculty_subjects").insert(rows)
    if (insErr) throw insErr
  },

  async findBySubject(periodId, subjectId) {
    const q = supabase.from("faculty_subjects").select("*")
    if (periodId) {
      const { data, error } = await q.eq("periodId", periodId).eq("subjectId", subjectId).single()
      if (error) {
        if (error.code === "PGRST116") return null
        throw error
      }
      return data as FacultySubjectData
    }
    const { data, error } = await q.is("periodId", null).eq("subjectId", subjectId).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as FacultySubjectData
  },
}
