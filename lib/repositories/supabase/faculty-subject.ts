import { supabase } from "@/lib/supabase"
import type { FacultySubjectData, IFacultySubjectRepository } from "@/lib/types"

export const facultySubjectRepository: IFacultySubjectRepository = {
  async list(periodId, facultyId) {
    let q = supabase.from("faculty_subjects").select("*").eq("periodId", periodId)
    if (facultyId) q = q.eq("facultyId", facultyId)
    const { data, error } = await q
    if (error) throw error
    return data as FacultySubjectData[]
  },

  async replaceAll(periodId, items) {
    const { error: delErr } = await supabase.from("faculty_subjects").delete().eq("periodId", periodId)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ ...i, periodId }))
    const { error: insErr } = await supabase.from("faculty_subjects").insert(rows)
    if (insErr) throw insErr
  },

  async findBySubject(periodId, subjectId) {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select("*")
      .eq("periodId", periodId)
      .eq("subjectId", subjectId)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as FacultySubjectData
  },
}
