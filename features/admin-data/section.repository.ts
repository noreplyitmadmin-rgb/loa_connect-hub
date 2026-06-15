import { supabase } from "@/lib/db"
import type { SectionData, ISectionRepository } from "@/lib/types"

export const sectionRepository: ISectionRepository = {
  async list() {
    const { data, error } = await supabase
      .from("sections")
      .select("*, departmentCourse:departmentCourseId(id, code, name, departmentId)")
      .order("program", { ascending: true })
      .order("name", { ascending: true })
    if (error) throw error
    return (data || []).map((row: Record<string, unknown>) => {
      const { departmentCourse, ...section } = row
      return {
        ...section,
        departmentCourseId: (departmentCourse as Record<string, unknown>)?.id as string,
      } as SectionData
    })
  },

  async upsertMany(items) {
    const result = new Map<string, SectionData>()

    const { data: existing, error: fetchErr } = await supabase.from("sections").select("*")
    if (fetchErr) throw fetchErr

    const lookup = new Map(existing!.map((s) => [`${s.name}|${s.program}`, s]))

    const inserts: { name: string; program: string; departmentCourseId: string }[] = []
    for (const item of items) {
      const key = `${item.name}|${item.program}`
      const existingRow = lookup.get(key)
      if (existingRow) {
        result.set(key, existingRow as SectionData)
      } else {
        inserts.push(item)
      }
    }

    if (inserts.length > 0) {
      const { data: created, error: insErr } = await supabase.from("sections").insert(inserts).select("*")
      if (insErr) throw insErr
      for (const row of created as SectionData[]) {
        result.set(`${row.name}|${row.program}`, row)
      }
    }

    return { data: result, created: inserts.length }
  },

  async findByNameAndProgram(name, program) {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("name", name)
      .eq("program", program)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SectionData
  },
}
