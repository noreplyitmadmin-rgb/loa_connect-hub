import { supabase } from "@/lib/supabase"
import type { StudentEnrollmentData, IStudentEnrollmentRepository } from "@/lib/types"

export const studentEnrollmentRepository: IStudentEnrollmentRepository = {
  async list(filters) {
    let q = supabase.from("student_enrollments").select("*")
    if (filters?.student_id) q = q.eq("student_id", filters.student_id)
    if (filters?.section_id) q = q.eq("section_id", filters.section_id)
    const { data, error } = await q
    if (error) throw error
    return data as StudentEnrollmentData[]
  },

  async replaceBySection(section_id, items) {
    const { error: delErr } = await supabase.from("student_enrollments").delete().eq("section_id", section_id)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ ...i, section_id }))
    const { error: insErr } = await supabase.from("student_enrollments").insert(rows)
    if (insErr) throw insErr
  },

  async getDistinctFaculty(student_id) {
    const { data: enrollments, error: enrollErr } = await supabase
      .from("student_enrollments")
      .select("section_id")
      .eq("student_id", student_id)
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    const sectionIds = enrollments.map((r) => r.section_id)
    const { data: fs, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("faculty_id")
      .in("section_id", sectionIds)
    if (fsErr) throw fsErr

    return [...new Set(fs.map((r) => r.faculty_id))]
  },
}
