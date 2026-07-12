import { supabase } from "@/lib/db"
import type { EvaluationPeriodData, IEvaluationPeriodRepository } from "@/lib/types"

type RawPeriodRow = Record<string, unknown> & { semesters?: { title: string } | null }

function flatten(row: RawPeriodRow): EvaluationPeriodData {
  const { semesters, ...rest } = row
  return { ...rest, semesterTitle: semesters?.title ?? undefined } as EvaluationPeriodData
}

export const evaluationPeriodRepository: IEvaluationPeriodRepository = {
  async list(filter) {
    let q = supabase.from("evaluation_periods").select("*, semesters!inner(title)").order("createdAt", { ascending: false })
    if (filter?.semesterId) q = q.eq("semesterId", filter.semesterId)
    if (filter?.isActive !== undefined) q = q.eq("isActive", filter.isActive)
    const { data, error } = await q
    if (error) throw error
    return (data as RawPeriodRow[]).map(flatten)
  },

  async findById(id) {
    const { data, error } = await supabase.from("evaluation_periods").select("*, semesters!inner(title)").eq("id", id).single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return flatten(data as RawPeriodRow)
  },

  async findActive() {
    const { data, error } = await supabase.from("evaluation_periods").select("*, semesters!inner(title)").eq("isActive", true)
    if (error) throw error
    if (data.length !== 1) return null
    return flatten(data[0] as RawPeriodRow)
  },

  async findBySemester(semesterId) {
    const { data, error } = await supabase
      .from("evaluation_periods")
      .select("*, semesters!inner(title)")
      .eq("semesterId", semesterId)
      .order("createdAt", { ascending: true })
    if (error) throw error
    return (data as RawPeriodRow[]).map(flatten)
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
