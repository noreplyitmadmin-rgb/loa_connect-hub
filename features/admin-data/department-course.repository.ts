import { supabase } from "@/lib/db"
import type { DepartmentCourseData, IDepartmentCourseRepository } from "@/lib/types"
import { singleQuery } from "@/lib/db/common"

export const departmentCourseRepository: IDepartmentCourseRepository = {
  async findByDepartmentAndCode(departmentId, code) {
    return singleQuery<DepartmentCourseData>(
      supabase.from("department_courses").select("*").eq("departmentId", departmentId).eq("code", code) as unknown as { single(): Promise<{ data: unknown; error: { code?: string; message?: string } | null }> },
    )
  },
  async create(data) {
    const { data: created, error } = await supabase.from("department_courses").insert(data).select("*").single()
    if (error) throw error
    return created as DepartmentCourseData
  },
}
