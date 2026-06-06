import { supabase } from "@/lib/supabase"
import type { SemesterData, ISemesterRepository, CreateSemesterInput } from "@/lib/types"

export const semesterRepository: ISemesterRepository = {
  async list(filter) {
    let q = supabase.from("semesters").select("*").order("createdAt", { ascending: false })
    if (filter?.isActive !== undefined) q = q.eq("isActive", filter.isActive)
    const { data, error } = await q
    if (error) throw error
    return data as SemesterData[]
  },

  async findById(id) {
    const { data, error } = await supabase.from("semesters").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SemesterData
  },

  async findActive() {
    const { data, error } = await supabase.from("semesters").select("*").eq("isActive", true).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as SemesterData
  },

  async create(input: CreateSemesterInput) {
    const { data, error } = await supabase.from("semesters").insert(input).select("*").single()
    if (error) throw error
    return data as SemesterData
  },

  async update(id, data) {
    const { data: updated, error } = await supabase.from("semesters").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as SemesterData
  },

  async delete(id) {
    const { error } = await supabase.from("semesters").delete().eq("id", id)
    if (error) throw error
  },

  async setActive(id) {
    await supabase.from("semesters").update({ isActive: false }).neq("id", id)
    const { data, error } = await supabase.from("semesters").update({ isActive: true }).eq("id", id).select("*").single()
    if (error) throw error
    return data as SemesterData
  },
}
