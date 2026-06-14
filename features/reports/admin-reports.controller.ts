import { departmentRepository, reportsRepository } from "@/lib/repositories/factory"
import type { FacultyStatsData, RawAppointmentData, ConsultationSummaryData, DepartmentFrequencyEntry, FacultyFrequencyData, DepartmentYearlyEntry, FacultyYearlyData, DepartmentSummary } from "@/lib/types"
import {
  getDepartmentSummary,
  mergeStats,
  mergeMonthlyFreq,
  mergeYearlyFreq,
  mergeFacultyMonthly,
  mergeFacultyYearly,
} from "./admin-reports.service"
import type { AdminReportResult } from "./admin-reports.service"

export async function getAdminReportData(
  filters?: { startDate?: string; endDate?: string; status?: string },
  selectedDepartmentId?: string | null
): Promise<AdminReportResult> {
  const departments = await departmentRepository.listAll()

  const departmentSummaries: DepartmentSummary[] = []
  for (const dept of departments) {
    if (selectedDepartmentId && dept.id !== selectedDepartmentId) continue
    const summary = await getDepartmentSummary(dept.id, dept.name, filters)
    departmentSummaries.push(summary)
  }

  let targetDepts = departments
  if (selectedDepartmentId) {
    targetDepts = departments.filter((d) => d.id === selectedDepartmentId)
  }

  const allStats: FacultyStatsData[][] = []
  const allRaw: RawAppointmentData[][] = []
  const allSummaries: ConsultationSummaryData[][] = []
  const allDeptFreq: DepartmentFrequencyEntry[][] = []
  const allFacFreq: FacultyFrequencyData[][] = []
  const allDeptYrFreq: DepartmentYearlyEntry[][] = []
  const allFacYrFreq: FacultyYearlyData[][] = []

  for (const dept of targetDepts) {
    const [stats, raw, summaries, deptFreq, facFreq, deptYrFreq, facYrFreq] = await Promise.all([
      reportsRepository.getDepartmentConsultationStats(dept.id, filters),
      reportsRepository.getDepartmentConsultationAppointments(dept.id, filters),
      reportsRepository.getConsultationSummaries(dept.id, filters),
      reportsRepository.getDepartmentFrequency(dept.id, filters),
      reportsRepository.getFacultyFrequency(dept.id, filters),
      reportsRepository.getDepartmentYearlyFrequency(dept.id, filters),
      reportsRepository.getFacultyYearlyFrequency(dept.id, filters),
    ])
    allStats.push(stats)
    allRaw.push(raw)
    allSummaries.push(summaries)
    allDeptFreq.push(deptFreq)
    allFacFreq.push(facFreq)
    allDeptYrFreq.push(deptYrFreq)
    allFacYrFreq.push(facYrFreq)
  }

  const departmentName = selectedDepartmentId
    ? targetDepts[0]?.name || "Unknown"
    : "All Departments"

  const departmentId = selectedDepartmentId || null

  const stats = mergeStats(allStats.flat(), [])
  const rawAppointments = allRaw.flat()
  const summaries = allSummaries.flat()
  const departmentFrequency = mergeMonthlyFreq(allDeptFreq)
  const facultyFrequency = mergeFacultyMonthly(allFacFreq)
  const departmentYearlyFrequency = mergeYearlyFreq(allDeptYrFreq)
  const facultyYearlyFrequency = mergeFacultyYearly(allFacYrFreq)

  return {
    departments: departmentSummaries,
    selectedDepartmentId: departmentId,
    departmentName,
    departmentId,
    stats,
    rawAppointments,
    summaries,
    departmentFrequency,
    facultyFrequency,
    departmentYearlyFrequency,
    facultyYearlyFrequency,
  }
}
