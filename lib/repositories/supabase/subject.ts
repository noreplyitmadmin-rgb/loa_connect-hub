import { supabase } from "@/lib/supabase"
import type { SubjectData, ISubjectRepository } from "@/lib/types"

export const subjectRepository: ISubjectRepository = {
  async list() {
    const { data, error } = await supabase.from("subjects").select("*").order("code", { ascending: true })
    if (error) throw error
    return data as SubjectData[]
  },

  async upsertMany(items) {
    const result = new Map<string, SubjectData>()

    const codes = items.map((i) => i.code)
    const { data: existing, error: fetchErr } = await supabase.from("subjects").select("*").in("code", codes)
    if (fetchErr) throw fetchErr

    for (const row of existing as SubjectData[]) {
      result.set(row.code, row)
    }

    const missing = items.filter((i) => !result.has(i.code))
    if (missing.length > 0) {
      const inserts = missing.map((i) => ({ code: i.code, name: i.name }))
      const { data: created, error: insertErr } = await supabase.from("subjects").insert(inserts).select("*")
      if (insertErr) throw insertErr
      for (const row of created as SubjectData[]) {
        result.set(row.code, row)
      }
    }

    return { data: result, created: missing.length }
  },

  async findByCode(code) {
    const { data, error } = await supabase.from("subjects").select("*").eq("code", code).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SubjectData
  },
}
