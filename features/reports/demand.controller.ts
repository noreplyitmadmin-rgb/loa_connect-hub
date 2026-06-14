import { reportsRepository, departmentRepository } from "@/lib/repositories/factory"
import type { DailyFrequencyData, WeeklyFrequencyData, DepartmentFrequencyEntry } from "@/lib/types"
import { mergeDaily, mergeWeekly, mergeMonthly } from "./demand.service"
import type { DemandReportResult } from "./demand.service"

export async function getDemandReportData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string; status?: string }
): Promise<DemandReportResult> {
  if (departmentId) {
    const dept = await departmentRepository.findById(departmentId)
    const deptName = dept?.name || "Unknown Department"

    const [daily, weekly, monthly] = await Promise.all([
      reportsRepository.getDepartmentDailyFrequency(departmentId, filters),
      reportsRepository.getDepartmentWeeklyFrequency(departmentId, filters),
      reportsRepository.getDepartmentFrequency(departmentId, filters),
    ])

    return { daily, weekly, monthly, departmentName: deptName }
  }

  const departments = await departmentRepository.listAll()

  const allDaily: DailyFrequencyData[][] = []
  const allWeekly: WeeklyFrequencyData[][] = []
  const allMonthly: DepartmentFrequencyEntry[][] = []

  for (const dept of departments) {
    const [daily, weekly, monthly] = await Promise.all([
      reportsRepository.getDepartmentDailyFrequency(dept.id, filters),
      reportsRepository.getDepartmentWeeklyFrequency(dept.id, filters),
      reportsRepository.getDepartmentFrequency(dept.id, filters),
    ])
    allDaily.push(daily)
    allWeekly.push(weekly)
    allMonthly.push(monthly)
  }

  const daily = mergeDaily(allDaily)
  const weekly = mergeWeekly(allWeekly)
  const monthly = mergeMonthly(allMonthly)

  return { daily, weekly, monthly, departmentName: "All Departments" }
}
