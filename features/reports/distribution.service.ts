import type { WorkloadDistributionEntry } from "@/lib/types"

export interface DistributionReportResult {
  entries: WorkloadDistributionEntry[]
  departmentTotal: number
  departmentName: string
  totalConsultations: number
  completedConsultations: number
  pendingConsultations: number
}


