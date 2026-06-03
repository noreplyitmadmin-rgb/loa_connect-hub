import { reportsRepository } from "@/lib/repositories/factory"
import type { CoverageReportData, CoverageData, CoverageTrendEntry } from "@/lib/types"

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"]

export async function getConsultationCoverageData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string }
): Promise<CoverageReportData> {
  if (departmentId) {
    return await reportsRepository.getConsultationCoverageData(departmentId, filters)
  }

  const { departmentRepository } = await import("@/lib/repositories/factory")
  const departments = await departmentRepository.listAll()

  const allResults: CoverageReportData[] = []
  for (const dept of departments) {
    const result = await reportsRepository.getConsultationCoverageData(dept.id, filters)
    allResults.push(result)
  }

  const totalStudents = allResults.reduce((s, r) => s + r.overall.totalStudents, 0)
  const studentsWithConsultations = allResults.reduce((s, r) => s + r.overall.studentsWithConsultations, 0)
  const studentsWithoutConsultations = totalStudents - studentsWithConsultations
  const coveragePercentage = totalStudents > 0 ? Math.round((studentsWithConsultations / totalStudents) * 100) : 0

  const byDepartment: (CoverageData & { departmentId: string; departmentName: string })[] = []
  for (const r of allResults) {
    byDepartment.push(...r.byDepartment)
  }

  const perMonth = new Map<string, number>()
  for (const r of allResults) {
    for (const entry of r.trend) {
      perMonth.set(entry.month, (perMonth.get(entry.month) || 0) + entry.studentsWithConsultations)
    }
  }

  const sortedMonths = Array.from(perMonth.entries()).sort(([a], [b]) => a.localeCompare(b))
  const trend: CoverageTrendEntry[] = []
  let runningTotal = 0
  for (const [month, count] of sortedMonths) {
    runningTotal += count
    const [yearStr, monthNum] = month.split("-")
    trend.push({
      month,
      monthName: MONTH_NAMES[parseInt(monthNum, 10) - 1],
      year: parseInt(yearStr, 10),
      totalStudents,
      studentsWithConsultations: runningTotal,
      coveragePercentage: totalStudents > 0 ? Math.round((runningTotal / totalStudents) * 100) : 0,
    })
  }

  return {
    overall: { totalStudents, studentsWithConsultations, studentsWithoutConsultations, coveragePercentage },
    byDepartment,
    trend,
    departmentName: "All Departments",
  }
}
