import { supabase } from "@/lib/supabase"
import type { SubjectData, ISubjectRepository } from "@/lib/types"

export const subjectRepository: ISubjectRepository = {
  async list(periodId) {
    let q = supabase.from("subjects").select("*")
    if (periodId) {
      q = q.eq("periodId", periodId)
    } else {
      q = q.is("periodId", null)
    }
    const { data, error } = await q.order("name", { ascending: true })
    if (error) throw error
    return data as SubjectData[]
  },

  async upsertMany(periodId, names) {
    const result = new Map<string, SubjectData>()
    let q = supabase.from("subjects").select("*")
    if (periodId) {
      q = q.eq("periodId", periodId)
    } else {
      q = q.is("periodId", null)
    }
    const { data: existing, error: fetchErr } = await q.in("name", names)
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
    let q = supabase.from("subjects").delete()
    if (periodId) {
      q = q.eq("periodId", periodId)
    } else {
      q = q.is("periodId", null)
    }
    const { error } = await q
    if (error) throw error
  },
}
