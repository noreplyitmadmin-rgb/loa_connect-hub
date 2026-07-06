import { supabase } from "@/lib/db"
import type { AuditLogData, IAuditLogRepository } from "@/lib/types"

export const auditLogRepository: IAuditLogRepository = {
  async create(data) {
    const { data: log, error } = await supabase
      .from("audit_logs")
      .insert(data)
      .select("*")
      .single()
    if (error) throw error
    return log as AuditLogData
  },
  async list(limit = 100, offset = 0, filters, orderBy, orderDir) {
    let q = supabase.from("audit_logs").select("*", { count: "exact" })

    if (filters?.action) q = q.eq("action", filters.action)
    if (filters?.email) q = q.ilike("email", `%${filters.email}%`)
    if (filters?.dateFrom) q = q.gte("createdAt", filters.dateFrom)
    if (filters?.dateTo) q = q.lte("createdAt", filters.dateTo)

    const col = orderBy || "createdAt"
    const dir: { ascending: boolean } = { ascending: orderDir === "asc" }
    const { data, error, count } = await q
      .order(col, dir)
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { logs: data as AuditLogData[], total: count ?? 0 }
  },
  async clearAll() {
    const { error } = await supabase.from("audit_logs").delete().neq("id", "00000000-0000-0000-0000-000000000000")
    if (error) throw error
  },
  async getDistinctActions() {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("action")
      .order("action", { ascending: true })
    if (error) throw error
    return [...new Set((data || []).map((r) => r.action))]
  },
}
