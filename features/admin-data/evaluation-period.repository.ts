import { supabase } from "@/lib/db"
import type { EvaluationPeriodData, IEvaluationPeriodRepository } from "@/lib/types"

export const evaluationPeriodRepository: IEvaluationPeriodRepository = {
  async list(filter) {
    let q = supabase.from("evaluation_periods").select("*").order("createdAt", { ascending: false })
    if (filter?.semesterId) q = q.eq("semesterId", filter.semesterId)
    if (filter?.isActive !== undefined) q = q.eq("isActive", filter.isActive)
    const { data, error } = await q
    if (error) throw error
    return data as EvaluationPeriodData[]
  },

  async findById(id) {
    const { data, error } = await supabase.from("evaluation_periods").select("*").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as EvaluationPeriodData
  },

  async findActive() {
    const { data, error } = await supabase.from("evaluation_periods").select("*").eq("isActive", true)
    if (error) throw error
    if (data.length !== 1) return null
    return data[0] as EvaluationPeriodData
  },

  async findBySemester(semesterId) {
    const { data, error } = await supabase
      .from("evaluation_periods")
      .select("*")
      .eq("semesterId", semesterId)
      .order("createdAt", { ascending: true })
    if (error) throw error
    return data as EvaluationPeriodData[]
  },

  async create(input) {
    const { data, error } = await supabase.from("evaluation_periods").insert(input).select("*").single()
    if (error) throw error
    return data as EvaluationPeriodData
  },

  async update(id, data) {
    const { data: updated, error } = await supabase.from("evaluation_periods").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as EvaluationPeriodData
  },

  async delete(id) {
    const { error } = await supabase.from("evaluation_periods").delete().eq("id", id)
    if (error) throw error
  },

  async setActive(id) {
    await supabase.from("evaluation_periods").update({ isActive: false }).neq("id", id)
    const { data, error } = await supabase.from("evaluation_periods").update({ isActive: true }).eq("id", id).select("*").single()
    if (error) throw error
    return data as EvaluationPeriodData
  },
}
