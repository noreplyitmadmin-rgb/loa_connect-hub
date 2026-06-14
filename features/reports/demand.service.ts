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



export function mergeDaily(entries: DailyFrequencyData[][]): DailyFrequencyData[] {
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

export function mergeWeekly(entries: WeeklyFrequencyData[][]): WeeklyFrequencyData[] {
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

export function mergeMonthly(entries: DepartmentFrequencyEntry[][]): DepartmentFrequencyEntry[] {
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
