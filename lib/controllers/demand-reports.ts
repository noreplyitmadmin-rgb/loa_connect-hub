import { reportsRepository } from "@/lib/repositories/factory"
import type {
  DailyFrequencyData,
  WeeklyFrequencyData,
  DepartmentFrequencyEntry,
} from "@/lib/types"

export interface DemandReportResult {
  daily: DailyFrequencyData[]
  weekly: WeeklyFrequencyData[]
  monthly: DepartmentFrequencyEntry[]
  departmentName: string
}

export async function getDemandReportData(
  departmentId: string | null,
  filters?: { startDate?: string; endDate?: string }
): Promise<DemandReportResult> {
  const { departmentRepository } = await import("@/lib/repositories/factory")

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

function mergeDaily(entries: DailyFrequencyData[][]): DailyFrequencyData[] {
  const map = new Map<string, number>()
  for (const arr of entries) {
    for (const e of arr) {
      map.set(e.date, (map.get(e.date) || 0) + e.count)
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({
      date,
      dayName: new Date(date + "T00:00:00").toLocaleDateString("en-US", { weekday: "long" }),
      count,
    }))
}

function mergeWeekly(entries: WeeklyFrequencyData[][]): WeeklyFrequencyData[] {
  const map = new Map<string, number>()
  for (const arr of entries) {
    for (const e of arr) {
      map.set(e.weekStart, (map.get(e.weekStart) || 0) + e.count)
    }
  }
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => {
      const start = new Date(weekStart + "T00:00:00")
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      const weekEnd = end.toISOString().slice(0, 10)
      const label = `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
      return { weekStart, weekEnd, label, count }
    })
}

function mergeMonthly(entries: DepartmentFrequencyEntry[][]): DepartmentFrequencyEntry[] {
  const map = new Map<string, number>()
  for (const arr of entries) {
    for (const e of arr) {
      map.set(e.month, (map.get(e.month) || 0) + e.count)
    }
  }
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"]
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => {
      const [yearStr, monthNum] = month.split("-")
      return {
        month,
        monthName: monthNames[parseInt(monthNum, 10) - 1],
        year: parseInt(yearStr, 10),
        count,
      }
    })
}
