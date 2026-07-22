import { supabase } from "@/lib/db"
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

    const existingMap = new Map((existing as SubjectData[]).map((s) => [s.code, s]))

    for (const row of existing as SubjectData[]) {
      result.set(row.code, row)
    }

    const missing = items.filter((i) => !existingMap.has(i.code))
    if (missing.length > 0) {
      const inserts = missing.map((i) => ({ code: i.code, name: i.name }))
      const { data: created, error: insertErr } = await supabase.from("subjects").insert(inserts).select("*")
      if (insertErr) throw insertErr
      for (const row of created as SubjectData[]) {
        result.set(row.code, row)
      }
    }

    const needsUpdate = items.filter((i) => {
      const existing = existingMap.get(i.code)
      return existing && existing.name !== i.name
    })
    for (const item of needsUpdate) {
      const existing = existingMap.get(item.code)!
      const { data: updated, error: updateErr } = await supabase.from("subjects").update({ name: item.name }).eq("id", existing.id).select("*").single()
      if (updateErr) throw updateErr
      result.set(item.code, updated as SubjectData)
    }

    return { data: result, created: missing.length, updated: needsUpdate.length }
  },

  async findByCode(code) {
    const { data, error } = await supabase.from("subjects").select("*").eq("code", code).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SubjectData
  },
  async findById(id) {
    const { data, error } = await supabase.from("subjects").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SubjectData
  },
  async findByIds(ids) {
    if (ids.length === 0) return []
    const { data, error } = await supabase.from("subjects").select("*").in("id", ids)
    if (error) throw error
    return (data || []) as SubjectData[]
  },
  async create(fields) {
    const { data, error } = await supabase.from("subjects").insert(fields).select("*").single()
    if (error) throw error
    return data as SubjectData
  },
  async update(id, fields) {
    const { data, error } = await supabase.from("subjects").update(fields).eq("id", id).select("*").single()
    if (error) throw error
    return data as SubjectData
  },
}
