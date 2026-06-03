import { reportsRepository, departmentRepository } from "@/lib/repositories/factory"
import type { FacultyResponseTime, ResponseTimeDistribution, ResponseTimeStats } from "@/lib/types"

export interface ResponsivenessReportResult {
  stats: ResponseTimeStats
  byFaculty: FacultyResponseTime[]
  distribution: ResponseTimeDistribution[]
  departmentName: string
}

export async function getResponsivenessReportData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string }
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

function mergeFacultyResponseTimes(entries: FacultyResponseTime[][]): FacultyResponseTime[] {
  const map = new Map<string, { name: string; totalHours: number; count: number; min: number; max: number }>()
  for (const arr of entries) {
    for (const f of arr) {
      if (!map.has(f.facultyId)) {
        map.set(f.facultyId, { name: f.facultyName, totalHours: 0, count: 0, min: Infinity, max: -Infinity })
      }
      const entry = map.get(f.facultyId)!
      entry.totalHours += f.averageHours * f.totalResponded
      entry.count += f.totalResponded
      entry.min = Math.min(entry.min, f.fastestHours)
      entry.max = Math.max(entry.max, f.slowestHours)
    }
  }

  return Array.from(map.entries()).map(([facultyId, data]) => ({
    facultyId,
    facultyName: data.name,
    averageHours: data.count > 0 ? Math.round((data.totalHours / data.count) * 100) / 100 : 0,
    medianHours: 0,
    fastestHours: Math.round(data.min * 100) / 100,
    slowestHours: Math.round(data.max * 100) / 100,
    totalResponded: data.count,
  }))
}

function mergeDistributions(entries: ResponseTimeDistribution[][]): ResponseTimeDistribution[] {
  if (entries.length === 0 || entries[0].length === 0) return []

  const labels = entries[0].map((e) => ({ label: e.label, fromHours: e.fromHours, toHours: e.toHours }))

  return labels.map((labelInfo) => {
    const count = entries.reduce((sum, arr) => {
      const match = arr.find((e) => e.label === labelInfo.label)
      return sum + (match?.count || 0)
    }, 0)
    return { ...labelInfo, count }
  })
}
