import { supabase } from "@/lib/db"
import type { EvaluationPeriodData, IEvaluationPeriodRepository, CreateEvaluationPeriodInput } from "@/lib/types"

type RawPeriodRow = Record<string, unknown> & { semesters?: { title: string } | null }

function flatten(row: RawPeriodRow): EvaluationPeriodData {
  const { semesters, rubric_group_id, ...rest } = row
  return { ...rest, rubricGroupId: rubric_group_id ?? null, semesterTitle: semesters?.title ?? undefined } as EvaluationPeriodData
}

function toRow(input: CreateEvaluationPeriodInput | Partial<EvaluationPeriodData>): Record<string, unknown> {
  const { rubricGroupId, ...rest } = input as Record<string, unknown>
  const row: Record<string, unknown> = { ...rest }
  if ("rubricGroupId" in (input as Record<string, unknown>)) {
    row.rubric_group_id = rubricGroupId ?? null
  }
  return row
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
    const { data, error } = await supabase.from("evaluation_periods").insert(toRow(input)).select("*").single()
    if (error) throw error
    return data as EvaluationPeriodData
  },

  async update(id, data) {
    const { data: updated, error } = await supabase.from("evaluation_periods").update(toRow(data)).eq("id", id).select("*").single()
    if (error) throw error
    return updated as EvaluationPeriodData
  },

  async delete(id) {
    const { error } = await supabase.from("evaluation_periods").delete().eq("id", id)
    if (error) throw error
  },

  async setActive(id) {
    await supabase.from("evaluation_periods").update({ isActive: false }).neq("id", id)
    const { data, error } = await supabase.from("evaluation_periods").update({ isActive: true }).eq("id", id).select("*, semesters!inner(title)").single()
    if (error) throw error
    return flatten(data as RawPeriodRow)
  },

  async hasEvaluations(id) {
    const { count, error } = await supabase
      .from("evaluations")
      .select("id", { count: "exact", head: true })
      .eq("evaluation_period_id", id)
    if (error) throw error
    return (count ?? 0) > 0
  },

  async reset(id) {
    await supabase.from("evaluations").update({ isInvalid: true }).eq("evaluation_period_id", id)
    await supabase.from("evaluation_periods").update({ isActive: false }).eq("id", id)
    await supabase.from("rubric_group_snapshots").delete().eq("evaluation_period_id", id)
  },
}
