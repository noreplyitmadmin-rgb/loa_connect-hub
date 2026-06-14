import type { FacultyResponseTime, ResponseTimeDistribution, ResponseTimeStats } from "@/lib/types"

export interface ResponsivenessReportResult {
  stats: ResponseTimeStats
  byFaculty: FacultyResponseTime[]
  distribution: ResponseTimeDistribution[]
  departmentName: string
}



export function mergeFacultyResponseTimes(entries: FacultyResponseTime[][]): FacultyResponseTime[] {
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

export function mergeDistributions(entries: ResponseTimeDistribution[][]): ResponseTimeDistribution[] {
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
