import { supabase } from "@/lib/supabase"
import { departmentRepository, reportsRepository, userRepository } from "@/lib/repositories/factory"
import type { FacultyStatsData, RawAppointmentData, ConsultationSummaryData, DepartmentFrequencyEntry, FacultyFrequencyData, DepartmentYearlyEntry, FacultyYearlyData, DepartmentSummary } from "@/lib/types"
import { hasRole } from "@/lib/utils/roles"

export interface AdminReportResult {
  departments: DepartmentSummary[]
  selectedDepartmentId: string | null
  departmentName: string
  departmentId: string | null
  stats: FacultyStatsData[]
  rawAppointments: RawAppointmentData[]
  summaries: ConsultationSummaryData[]
  departmentFrequency: DepartmentFrequencyEntry[]
  facultyFrequency: FacultyFrequencyData[]
  departmentYearlyFrequency: DepartmentYearlyEntry[]
  facultyYearlyFrequency: FacultyYearlyData[]
}

async function getDepartmentSummary(
  deptId: string,
  deptName: string,
  filters?: { startDate?: string; endDate?: string }
): Promise<DepartmentSummary> {
  const facultyUsers = (await userRepository.listByDepartment(deptId))
    .filter((u) => hasRole(u.role, "FACULTY") || hasRole(u.role, "DEAN"))

  const facultyIds = facultyUsers.map((u) => u.id)

  let total = 0
  let completed = 0
  let pending = 0
  let approved = 0
  let rejected = 0
  let cancelled = 0

  if (facultyIds.length > 0) {
    let query = supabase
      .from("appointments")
      .select("status")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments } = await query
    if (appointments) {
      for (const apt of appointments as Record<string, unknown>[]) {
        total++
        switch (apt.status) {
          case "COMPLETED": completed++; break
          case "PENDING": pending++; break
          case "APPROVED": approved++; break
          case "REJECTED": rejected++; break
          case "CANCELLED": cancelled++; break
        }
      }
    }
  }

  return {
    id: deptId,
    name: deptName,
    facultyCount: facultyUsers.length,
    total,
    completed,
    pending,
    approved,
    rejected,
    cancelled,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
}

function mergeStats(acc: FacultyStatsData[], deptStats: FacultyStatsData[]): FacultyStatsData[] {
  const map = new Map(acc.map((s) => [s.facultyId, s]))
  for (const s of deptStats) {
    if (!map.has(s.facultyId)) {
      map.set(s.facultyId, { ...s })
    }
  }
  return Array.from(map.values())
}

function mergeMonthlyFreq(entries: DepartmentFrequencyEntry[][]): DepartmentFrequencyEntry[] {
  const map = new Map<string, DepartmentFrequencyEntry>()
  for (const arr of entries) {
    for (const e of arr) {
      const existing = map.get(e.month)
      if (existing) {
        existing.count += e.count
      } else {
        map.set(e.month, { ...e })
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
}

function mergeYearlyFreq(entries: DepartmentYearlyEntry[][]): DepartmentYearlyEntry[] {
  const map = new Map<number, number>()
  for (const arr of entries) {
    for (const e of arr) {
      map.set(e.year, (map.get(e.year) || 0) + e.count)
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ year, count }))
}

function mergeFacultyMonthly(data: FacultyFrequencyData[][]): FacultyFrequencyData[] {
  const map = new Map<string, FacultyFrequencyData>()
  for (const arr of data) {
    for (const f of arr) {
      if (!map.has(f.facultyId)) {
        map.set(f.facultyId, { ...f, monthlyCounts: [...f.monthlyCounts] })
      } else {
        const existing = map.get(f.facultyId)!
        existing.total += f.total
        existing.averagePerMonth = existing.total / Math.max(existing.monthlyCounts.length, 1)
        for (const mc of f.monthlyCounts) {
          const found = existing.monthlyCounts.find((e) => e.month === mc.month)
          if (found) {
            found.count += mc.count
          } else {
            existing.monthlyCounts.push({ ...mc })
          }
        }
        existing.monthlyCounts.sort((a, b) => a.month.localeCompare(b.month))
      }
    }
  }
  return Array.from(map.values())
}

function mergeFacultyYearly(data: FacultyYearlyData[][]): FacultyYearlyData[] {
  const map = new Map<string, FacultyYearlyData>()
  for (const arr of data) {
    for (const f of arr) {
      if (!map.has(f.facultyId)) {
        map.set(f.facultyId, { ...f, yearlyCounts: [...f.yearlyCounts] })
      } else {
        const existing = map.get(f.facultyId)!
        existing.total += f.total
        existing.averagePerYear = existing.total / Math.max(existing.yearlyCounts.length, 1)
        for (const yc of f.yearlyCounts) {
          const found = existing.yearlyCounts.find((e) => e.year === yc.year)
          if (found) {
            found.count += yc.count
          } else {
            existing.yearlyCounts.push({ ...yc })
          }
        }
        existing.yearlyCounts.sort((a, b) => a.year - b.year)
      }
    }
  }
  return Array.from(map.values())
}

export async function getAdminReportData(
  filters?: { startDate?: string; endDate?: string; status?: string },
  selectedDepartmentId?: string | null
): Promise<AdminReportResult> {
  const departments = await departmentRepository.listAll()

  const departmentSummaries: DepartmentSummary[] = []
  for (const dept of departments) {
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
