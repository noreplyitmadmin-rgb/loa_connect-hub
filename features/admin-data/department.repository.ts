import { supabase } from "@/lib/db"
import type { DepartmentData, IDepartmentRepository } from "@/lib/types"
import { singleQuery } from "@/lib/db/common"

export const departmentRepository: IDepartmentRepository = {
  async listAll() {
    const { data, error } = await supabase.from("departments").select("*")
    if (error) throw error
    return data as DepartmentData[]
  },
  async findById(id) {
    return singleQuery<DepartmentData>(supabase.from("departments").select("*").eq("id", id) as unknown as { single(): Promise<{ data: unknown; error: { code?: string; message?: string } | null }> })
  },
  async findByCode(code) {
    const { data, error } = await supabase.from("departments").select("*").eq("code", code)
    if (error) throw error
    return (data?.[0] as DepartmentData) ?? null
  },
  async findByDeanId(deanId) {
    const { data, error } = await supabase.from("departments").select("*").eq("deanId", deanId)
    if (error) throw error
    return (data?.[0] as DepartmentData) ?? null
  },
  async create(data) {
    const { data: created, error } = await supabase.from("departments").insert({ ...data, isDisabled: false }).select("*").single()
    if (error) throw error
    return created as DepartmentData
  },
  async update(id, data) {
    const { data: updated, error } = await supabase.from("departments").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as DepartmentData
  },
}
