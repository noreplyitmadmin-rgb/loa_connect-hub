import { supabase } from "@/lib/supabase"
import type { FacultySubjectData, IFacultySubjectRepository } from "@/lib/types"

export const facultySubjectRepository: IFacultySubjectRepository = {
  async list(filters) {
    let q = supabase.from("faculty_subjects").select("*")
    if (filters?.faculty_id) q = q.eq("faculty_id", filters.faculty_id)
    if (filters?.section_id) q = q.eq("section_id", filters.section_id)
    const { data, error } = await q
    if (error) throw error
    return data as FacultySubjectData[]
  },

  async replaceBySection(section_id, items) {
    const { error: delErr } = await supabase.from("faculty_subjects").delete().eq("section_id", section_id)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ ...i, section_id }))
    const { error: insErr } = await supabase.from("faculty_subjects").insert(rows)
    if (insErr) throw insErr
  },

  async findBySubjectAndSection(subject_id, section_id) {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select("*")
      .eq("subject_id", subject_id)
      .eq("section_id", section_id)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as FacultySubjectData
  },
}
