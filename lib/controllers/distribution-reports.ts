import { reportsRepository } from "@/lib/repositories/factory"
import type { WorkloadDistributionEntry } from "@/lib/types"

export interface DistributionReportResult {
  entries: WorkloadDistributionEntry[]
  departmentTotal: number
  departmentName: string
  totalConsultations: number
  completedConsultations: number
  pendingConsultations: number
}

export async function getWorkloadDistributionData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<DistributionReportResult> {
  if (departmentId) {
    const data = await reportsRepository.getWorkloadDistribution(departmentId, filters)
    return {
      ...data,
      totalConsultations: data.departmentTotal,
      completedConsultations: data.entries.reduce((s, e) => s + e.completed, 0),
      pendingConsultations: data.entries.reduce((s, e) => s + e.pending, 0),
    }
  }

  const { departmentRepository } = await import("@/lib/repositories/factory")
  const departments = await departmentRepository.listAll()

  const allEntries: WorkloadDistributionEntry[] = []
  let overallTotal = 0
  let overallCompleted = 0
  let overallPending = 0

  for (const dept of departments) {
    const { entries, departmentTotal } = await reportsRepository.getWorkloadDistribution(dept.id, filters)
    allEntries.push(...entries)
    overallTotal += departmentTotal
    overallCompleted += entries.reduce((s, e) => s + e.completed, 0)
    overallPending += entries.reduce((s, e) => s + e.pending, 0)
  }

  const recalculated = allEntries.map((e) => ({
    ...e,
    departmentShare: overallTotal > 0 ? Math.round((e.total / overallTotal) * 100) : 0,
  }))

  return {
    entries: recalculated,
    departmentTotal: overallTotal,
    departmentName: "All Departments",
    totalConsultations: overallTotal,
    completedConsultations: overallCompleted,
    pendingConsultations: overallPending,
  }
}
