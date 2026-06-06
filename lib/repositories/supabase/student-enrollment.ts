import { supabase } from "@/lib/supabase"
import type { StudentEnrollmentData, IStudentEnrollmentRepository } from "@/lib/types"

export const studentEnrollmentRepository: IStudentEnrollmentRepository = {
  async list(filters) {
    let q = supabase.from("student_enrollments").select("*")
    if (filters?.student_id) q = q.eq("student_id", filters.student_id)
    if (filters?.section_id) q = q.eq("section_id", filters.section_id)
    if (filters?.semesterId) q = q.eq("semesterId", filters.semesterId)
    const { data, error } = await q
    if (error) throw error
    return data as StudentEnrollmentData[]
  },

  async replaceBySection(section_id, items) {
    const { error: delErr } = await supabase.from("student_enrollments").delete().eq("section_id", section_id)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ student_id: i.student_id, section_id, semesterId: i.semesterId ?? null }))
    const { error: insErr } = await supabase.from("student_enrollments").insert(rows)
    if (insErr) throw insErr
  },

  async addEnrollments(items) {
    if (items.length === 0) return
    const sectionIds = [...new Set(items.map((i) => i.section_id))]
    const { data: existing, error: fetchErr } = await supabase
      .from("student_enrollments")
      .select("student_id, section_id")
      .in("section_id", sectionIds)
    if (fetchErr) throw fetchErr
    const existingSet = new Set((existing || []).map((r) => `${r.student_id}|${r.section_id}`))
    const newItems = items.filter((i) => !existingSet.has(`${i.student_id}|${i.section_id}`))
    if (newItems.length === 0) return
    const { error: insErr } = await supabase.from("student_enrollments").insert(newItems)
    if (insErr) throw insErr
  },

  async getDistinctFaculty(student_id, semesterId) {
    let q = supabase.from("student_enrollments").select("section_id").eq("student_id", student_id)
    if (semesterId) q = q.eq("semesterId", semesterId) as typeof q
    const { data: enrollments, error: enrollErr } = await q
    if (enrollErr) throw enrollErr
    if (enrollments.length === 0) return []

    const sectionIds = enrollments.map((r) => r.section_id)
    let fsQ = supabase.from("faculty_subjects").select("faculty_id").in("section_id", sectionIds)
    if (semesterId) fsQ = fsQ.eq("semesterId", semesterId) as typeof fsQ
    const { data: fs, error: fsErr } = await fsQ
    if (fsErr) throw fsErr

    return [...new Set(fs.map((r) => r.faculty_id))]
  },
}
