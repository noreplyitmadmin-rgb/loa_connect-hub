import { supabase } from "@/lib/supabase"
import type { StudentEnrollmentData, IStudentEnrollmentRepository } from "@/lib/types"

export const studentEnrollmentRepository: IStudentEnrollmentRepository = {
  async list(periodId, studentId) {
    let q = supabase.from("student_enrollments").select("*").eq("periodId", periodId)
    if (studentId) q = q.eq("studentId", studentId)
    const { data, error } = await q
    if (error) throw error
    return data as StudentEnrollmentData[]
  },

  async replaceAll(periodId, items) {
    const { error: delErr } = await supabase.from("student_enrollments").delete().eq("periodId", periodId)
    if (delErr) throw delErr
    if (items.length === 0) return
    const rows = items.map((i) => ({ ...i, periodId }))
    const { error: insErr } = await supabase.from("student_enrollments").insert(rows)
    if (insErr) throw insErr
  },

  async getDistinctFaculty(studentId, periodId) {
    const { data, error } = await supabase
      .from("student_enrollments")
      .select("subjectId")
      .eq("studentId", studentId)
      .eq("periodId", periodId)
    if (error) throw error
    if (data.length === 0) return []

    const subjectIds = data.map((r) => r.subjectId)
    const { data: fs, error: fsErr } = await supabase
      .from("faculty_subjects")
      .select("facultyId")
      .eq("periodId", periodId)
      .in("subjectId", subjectIds)
    if (fsErr) throw fsErr

    return [...new Set(fs.map((r) => r.facultyId))]
  },
}
