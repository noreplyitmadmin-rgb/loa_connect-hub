import { supabase } from "@/lib/supabase"
import type { SubjectData, ISubjectRepository } from "@/lib/types"

export const subjectRepository: ISubjectRepository = {
  async list(periodId) {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("periodId", periodId)
      .order("name", { ascending: true })
    if (error) throw error
    return data as SubjectData[]
  },

  async upsertMany(periodId, names) {
    const result = new Map<string, SubjectData>()
    const { data: existing, error: fetchErr } = await supabase
      .from("subjects")
      .select("*")
      .eq("periodId", periodId)
      .in("name", names)
    if (fetchErr) throw fetchErr
    for (const row of existing as SubjectData[]) {
      result.set(row.name, row)
    }

    const missing = names.filter((n) => !result.has(n))
    if (missing.length > 0) {
      const inserts = missing.map((name) => ({ name, periodId }))
      const { data: created, error: insertErr } = await supabase
        .from("subjects")
        .insert(inserts)
        .select("*")
      if (insertErr) throw insertErr
      for (const row of created as SubjectData[]) {
        result.set(row.name, row)
      }
    }

    return result
  },

  async deleteByPeriod(periodId) {
    const { error } = await supabase.from("subjects").delete().eq("periodId", periodId)
    if (error) throw error
  },
}
