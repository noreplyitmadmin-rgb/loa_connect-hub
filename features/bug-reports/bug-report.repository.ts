import { supabase } from "@/lib/db"
import type { BugReportData, IBugReportRepository } from "@/lib/types"

export const bugReportRepository: IBugReportRepository = {
  async create(data) {
    const { data: report, error } = await supabase
      .from("bug_reports")
      .insert(data)
      .select("*")
      .single()
    if (error) throw error
    return report as BugReportData
  },

  async list(limit = 50, offset = 0, filters) {
    let q = supabase.from("bug_reports").select("*", { count: "exact" })
    if (filters?.status) q = q.eq("status", filters.status)
    const { data, error, count } = await q
      .order("createdAt", { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) throw error
    return { reports: data as BugReportData[], total: count ?? 0 }
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from("bug_reports")
      .update({ status })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return data as BugReportData
  },
}
