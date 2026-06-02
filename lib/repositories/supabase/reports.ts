import { supabase } from "@/lib/supabase"
import type { FacultyStatsData, DailyFrequencyData, WeeklyFrequencyData, IReportsRepository } from "@/lib/types"
import { userRepository } from "./user"
import type { DbRecord } from "./common"

export const reportsRepository: IReportsRepository = {
  async getDepartmentConsultationStats(departmentId, filters) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    let query = supabase
      .from("appointments")
      .select("facultyId, status")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }
    if (filters?.status) {
      const statusMap: Record<string, string> = {
        "completed": "COMPLETED",
        "pending": "PENDING",
        "approved": "APPROVED",
        "cancelled": "CANCELLED",
        "rejected": "REJECTED",
      }
      const dbStatus = statusMap[filters.status.toLowerCase()] || filters.status
      query = query.eq("status", dbStatus)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const statsMap = new Map<string, FacultyStatsData>()

    for (const faculty of facultyUsers || []) {
      statsMap.set(faculty.id, {
        facultyId: faculty.id,
        facultyName: faculty.name,
        total: 0,
        completed: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        completionRate: 0,
      })
    }

    for (const apt of (appointments || []) as DbRecord[]) {
      const stat = statsMap.get(apt.facultyId as string)
      if (!stat) continue

      stat.total++

      switch (apt.status) {
        case "COMPLETED":
          stat.completed++
          break
        case "PENDING":
          stat.pending++
          break
        case "APPROVED":
          stat.approved++
          break
        case "REJECTED":
          stat.rejected++
          break
        case "CANCELLED":
          stat.cancelled++
          break
      }
    }

    for (const stat of statsMap.values()) {
      stat.completionRate = stat.total > 0
        ? Math.round((stat.completed / stat.total) * 100)
        : 0
    }

    return Array.from(statsMap.values())
  },

  async getDepartmentConsultationAppointments(departmentId, filters) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    const facultyNameMap = new Map(facultyUsers.map((u) => [u.id, u.name]))

    let query = supabase
      .from("appointments")
      .select("id, facultyId, date, startTime, endTime, status, title, student:users!appointments_studentId_fkey(name)")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }
    if (filters?.status) {
      const statusMap: Record<string, string> = {
        "completed": "COMPLETED",
        "pending": "PENDING",
        "approved": "APPROVED",
        "cancelled": "CANCELLED",
        "rejected": "REJECTED",
      }
      const dbStatus = statusMap[filters.status.toLowerCase()] || filters.status
      query = query.eq("status", dbStatus)
    }

    const { data: appointments, error: apptError } = await query.order("date", { ascending: true }).order("startTime", { ascending: true })
    if (apptError) throw apptError

    return ((appointments || []) as DbRecord[]).map((apt: DbRecord) => ({
      id: apt.id as string,
      facultyId: apt.facultyId as string,
      facultyName: facultyNameMap.get(apt.facultyId as string) || "Unknown",
      studentName: (apt.student as DbRecord)?.name as string || "Unknown",
      date: apt.date as string,
      startTime: apt.startTime as string,
      endTime: apt.endTime as string,
      status: apt.status as string,
      title: apt.title as string | null,
    }))
  },

  async getConsultationSummaries(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    const facultyNameMap = new Map(facultyUsers.map((u) => [u.id, u.name]))

    let query = supabase
      .from("appointments")
      .select("id, facultyId, studentId, date, startTime, endTime, status, title, description, actionTaken, additionalRemarks, student:users!appointments_studentId_fkey(name)")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }
    if (filters?.status) {
      const statusMap: Record<string, string> = {
        "completed": "COMPLETED",
        "pending": "PENDING",
        "approved": "APPROVED",
        "cancelled": "CANCELLED",
        "rejected": "REJECTED",
      }
      const dbStatus = statusMap[filters.status.toLowerCase()] || filters.status
      query = query.eq("status", dbStatus)
    }

    const { data: appointments, error: apptError } = await query
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (apptError) throw apptError

    const appointmentIds = ((appointments || []) as DbRecord[]).map((a: DbRecord) => a.id as string)
    const fileAppointmentIds = new Set<string>()

    if (appointmentIds.length > 0) {
      const { data: files } = await supabase
        .from("appointment_files")
        .select("appointmentId")
        .in("appointmentId", appointmentIds)
      if (files) {
        for (const f of files) {
          fileAppointmentIds.add(f.appointmentId)
        }
      }
    }

    return ((appointments || []) as DbRecord[]).map((apt: DbRecord) => ({
      id: apt.id as string,
      facultyId: apt.facultyId as string,
      facultyName: facultyNameMap.get(apt.facultyId as string) || "Unknown",
      studentName: (apt.student as DbRecord)?.name as string || "Unknown",
      studentId: apt.studentId as string,
      date: apt.date as string,
      startTime: apt.startTime as string,
      endTime: apt.endTime as string,
      status: apt.status as string,
      title: apt.title as string | null,
      description: apt.description as string | null,
      actionTaken: apt.actionTaken as string | null,
      additionalRemarks: apt.additionalRemarks as string | null,
      hasFiles: fileAppointmentIds.has(apt.id as string),
    }))
  },

  async getDepartmentFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    let query = supabase
      .from("appointments")
      .select("date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const monthMap = new Map<string, number>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const month = (apt.date as string).substring(0, 7)
      monthMap.set(month, (monthMap.get(month) || 0) + 1)
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"]

    return Array.from(monthMap.entries())
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
  },

  async getFacultyFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    const facultyNameMap = new Map(facultyUsers.map((u) => [u.id, u.name]))

    let query = supabase
      .from("appointments")
      .select("facultyId, date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const facultyGroup = new Map<string, Map<string, number>>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const month = (apt.date as string).substring(0, 7)
      if (!facultyGroup.has(apt.facultyId as string)) {
        facultyGroup.set(apt.facultyId as string, new Map())
      }
      const monthMap = facultyGroup.get(apt.facultyId as string)!
      monthMap.set(month, (monthMap.get(month) || 0) + 1)
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"]

    return Array.from(facultyGroup.entries()).map(([facultyId, monthMap]) => {
      const monthlyCounts = Array.from(monthMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({
          month,
          monthName: monthNames[parseInt(month.split("-")[1], 10) - 1],
          count,
        }))

      const total = monthlyCounts.reduce((sum, m) => sum + m.count, 0)
      const distinctMonths = monthMap.size
      const averagePerMonth = distinctMonths > 0 ? Math.round((total / distinctMonths) * 100) / 100 : 0

      return {
        facultyId,
        facultyName: facultyNameMap.get(facultyId) || "Unknown",
        total,
        averagePerMonth,
        monthlyCounts,
      }
    })
  },

  async getDepartmentYearlyFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    let query = supabase
      .from("appointments")
      .select("date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const yearMap = new Map<string, number>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const year = (apt.date as string).substring(0, 4)
      yearMap.set(year, (yearMap.get(year) || 0) + 1)
    }

    return Array.from(yearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({
        year: parseInt(year, 10),
        count,
      }))
  },

  async getDepartmentDailyFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    let query = supabase
      .from("appointments")
      .select("date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const dayMap = new Map<string, number>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const date = apt.date as string
      dayMap.set(date, (dayMap.get(date) || 0) + 1)
    }

    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

    return Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        const d = new Date(date + "T00:00:00")
        return {
          date,
          dayName: dayNames[d.getDay()],
          count,
        } as DailyFrequencyData
      })
  },

  async getDepartmentWeeklyFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    let query = supabase
      .from("appointments")
      .select("date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const weekMap = new Map<string, number>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const d = new Date((apt.date as string) + "T00:00:00")
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(d.setDate(diff))
      const weekStart = monday.toISOString().slice(0, 10)
      weekMap.set(weekStart, (weekMap.get(weekStart) || 0) + 1)
    }

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

    return Array.from(weekMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([weekStart, count]) => {
        const start = new Date(weekStart + "T00:00:00")
        const end = new Date(start)
        end.setDate(end.getDate() + 6)
        const weekEnd = end.toISOString().slice(0, 10)
        const label = `${monthNames[start.getMonth()]} ${start.getDate()} - ${monthNames[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`
        return {
          weekStart,
          weekEnd,
          label,
          count,
        } as WeeklyFrequencyData
      })
  },

  async getFacultyYearlyFrequency(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    const facultyNameMap = new Map(facultyUsers.map((u) => [u.id, u.name]))

    let query = supabase
      .from("appointments")
      .select("facultyId, date")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const facultyGroup = new Map<string, Map<string, number>>()

    for (const apt of (appointments || []) as DbRecord[]) {
      const year = (apt.date as string).substring(0, 4)
      if (!facultyGroup.has(apt.facultyId as string)) {
        facultyGroup.set(apt.facultyId as string, new Map())
      }
      const yearMap = facultyGroup.get(apt.facultyId as string)!
      yearMap.set(year, (yearMap.get(year) || 0) + 1)
    }

    return Array.from(facultyGroup.entries()).map(([facultyId, yearMap]) => {
      const yearlyCounts = Array.from(yearMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([year, count]) => ({
          year: parseInt(year, 10),
          count,
        }))

      const total = yearlyCounts.reduce((sum, y) => sum + y.count, 0)
      const distinctYears = yearMap.size
      const averagePerYear = distinctYears > 0 ? Math.round((total / distinctYears) * 100) / 100 : 0

      return {
        facultyId,
        facultyName: facultyNameMap.get(facultyId) || "Unknown",
        total,
        averagePerYear,
        yearlyCounts,
      }
    })
  },
}
