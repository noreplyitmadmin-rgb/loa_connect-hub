import { reportsRepository, departmentRepository } from "@/lib/repositories/factory"
import type { FacultyResponseTime, ResponseTimeDistribution, ResponseTimeStats } from "@/lib/types"
import { mergeFacultyResponseTimes, mergeDistributions } from "./responsiveness.service"
import type { ResponsivenessReportResult } from "./responsiveness.service"

export async function getResponsivenessReportData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<ResponsivenessReportResult> {
  if (departmentId) {
    const dept = await departmentRepository.findById(departmentId)
    const deptName = dept?.name || "Unknown Department"

    const result = await reportsRepository.getDepartmentResponseTimes(departmentId, filters)
    return { ...result, departmentName: deptName }
  }

  const departments = await departmentRepository.listAll()

  let mergedStats: ResponseTimeStats | null = null
  const allByFaculty: FacultyResponseTime[][] = []
  const allDistributions: ResponseTimeDistribution[][] = []

  for (const dept of departments) {
    const { stats, byFaculty, distribution } = await reportsRepository.getDepartmentResponseTimes(dept.id, filters)
    allByFaculty.push(byFaculty)
    allDistributions.push(distribution)

    if (stats.totalResponded > 0) {
      if (!mergedStats) {
        mergedStats = { ...stats }
      } else {
        mergedStats.averageHours = (mergedStats.averageHours * mergedStats.totalResponded + stats.averageHours * stats.totalResponded) / (mergedStats.totalResponded + stats.totalResponded)
        mergedStats.fastestHours = Math.min(mergedStats.fastestHours, stats.fastestHours)
        mergedStats.slowestHours = Math.max(mergedStats.slowestHours, stats.slowestHours)
        mergedStats.totalResponded += stats.totalResponded
      }
    }
  }

  const byFaculty = mergeFacultyResponseTimes(allByFaculty)
  const distribution = mergeDistributions(allDistributions)

  const stats = mergedStats || { averageHours: 0, medianHours: 0, fastestHours: 0, slowestHours: 0, totalResponded: 0 }

  return { stats, byFaculty, distribution, departmentName: "All Departments" }
}
