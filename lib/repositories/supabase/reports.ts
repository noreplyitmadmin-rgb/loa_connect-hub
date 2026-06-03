import { supabase } from "@/lib/supabase"
import type { FacultyStatsData, DailyFrequencyData, WeeklyFrequencyData, FacultyResponseTime, ResponseTimeStats, ResponseTimeDistribution, BacklogEntry, BacklogAgingBucket, BacklogSummary, IReportsRepository, CoverageData, CoverageTrendEntry, WorkloadDistributionEntry } from "@/lib/types"
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

  async getDepartmentBacklog(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) {
      return {
        entries: [],
        agingBuckets: [],
        summary: { totalPending: 0, totalApproved: 0, totalUnresolved: 0, oldestDays: 0, oldestDate: null, oldestFaculty: "", oldestStudent: "" },
      }
    }

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
    } else {
      query = query.in("status", ["PENDING", "APPROVED"])
    }

    const { data: appointments, error: apptError } = await query.order("date", { ascending: true })
    if (apptError) throw apptError

    const raw = (appointments || []) as DbRecord[]
    if (raw.length === 0) {
      return {
        entries: [],
        agingBuckets: [],
        summary: { totalPending: 0, totalApproved: 0, totalUnresolved: 0, oldestDays: 0, oldestDate: null, oldestFaculty: "", oldestStudent: "" },
      }
    }

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

    const buckets: { label: string; fromDays: number; toDays: number | null }[] = [
      { label: "0 - 3 Days", fromDays: 0, toDays: 3 },
      { label: "4 - 7 Days", fromDays: 4, toDays: 7 },
      { label: "8 - 14 Days", fromDays: 8, toDays: 14 },
      { label: "More Than 14 Days", fromDays: 14, toDays: null },
    ]

    const bucketCounts = new Map<string, number>(buckets.map((b) => [b.label, 0]))

    let oldestEntry: BacklogEntry | null = null

    const entries: BacklogEntry[] = raw.map((apt) => {
      const aptDate = new Date((apt.date as string) + "T00:00:00")
      const ageMs = today.getTime() - aptDate.getTime()
      const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24))

      const bucket = buckets.find((b) =>
        b.toDays === null ? ageDays >= b.fromDays : ageDays >= b.fromDays && ageDays <= b.toDays
      )
      const bucketLabel = bucket?.label || "More Than 14 Days"
      bucketCounts.set(bucketLabel, (bucketCounts.get(bucketLabel) || 0) + 1)

      const entry: BacklogEntry = {
        id: apt.id as string,
        facultyId: apt.facultyId as string,
        facultyName: facultyNameMap.get(apt.facultyId as string) || "Unknown",
        studentName: (apt.student as DbRecord)?.name as string || "Unknown",
        date: apt.date as string,
        startTime: apt.startTime as string,
        endTime: apt.endTime as string,
        status: apt.status as "PENDING" | "APPROVED",
        title: apt.title as string | null,
        ageDays,
        agingBucket: bucketLabel,
      }

      if (!oldestEntry || ageDays > oldestEntry.ageDays) {
        oldestEntry = entry
      }

      return entry
    })

    const totalPending = entries.filter((e) => e.status === "PENDING").length
    const totalApproved = entries.filter((e) => e.status === "APPROVED").length

    const agingBuckets: BacklogAgingBucket[] = buckets.map((b) => ({
      label: b.label,
      fromDays: b.fromDays,
      toDays: b.toDays,
      count: bucketCounts.get(b.label) || 0,
    }))

    const oldest = oldestEntry as BacklogEntry | null

    const summary: BacklogSummary = {
      totalPending,
      totalApproved,
      totalUnresolved: entries.length,
      oldestDays: oldest?.ageDays || 0,
      oldestDate: oldest?.date || null,
      oldestFaculty: oldest?.facultyName || "",
      oldestStudent: oldest?.studentName || "",
    }

    return { entries, agingBuckets, summary }
  },

  async getDepartmentResponseTimes(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) {
      return { stats: { averageHours: 0, medianHours: 0, fastestHours: 0, slowestHours: 0, totalResponded: 0 }, byFaculty: [], distribution: [] }
    }

    const facultyNameMap = new Map(facultyUsers.map((u) => [u.id, u.name]))

    let query = supabase
      .from("appointments")
      .select("facultyId, requestedAt, updatedAt")
      .eq("meetingType", "CONSULTATION")
      .in("facultyId", facultyIds)

    const statusMap: Record<string, string> = {
      "completed": "COMPLETED",
      "pending": "PENDING",
      "approved": "APPROVED",
      "cancelled": "CANCELLED",
      "rejected": "REJECTED",
    }
    if (filters?.status) {
      const dbStatus = statusMap[filters.status.toLowerCase()] || filters.status
      query = query.eq("status", dbStatus)
    } else {
      query = query.neq("status", "PENDING")
    }

    if (filters?.startDate) {
      query = query.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte("date", filters.endDate)
    }

    const { data: appointments, error: apptError } = await query
    if (apptError) throw apptError

    const raw = (appointments || []) as { facultyId: string; requestedAt: string; updatedAt: string }[]

    if (raw.length === 0) {
      return { stats: { averageHours: 0, medianHours: 0, fastestHours: 0, slowestHours: 0, totalResponded: 0 }, byFaculty: [], distribution: [] }
    }

    const allHours: number[] = []
    const facultyMap = new Map<string, number[]>()

    for (const apt of raw) {
      const req = new Date(apt.requestedAt).getTime()
      const upd = new Date(apt.updatedAt).getTime()
      const hours = (upd - req) / (1000 * 60 * 60)

      if (hours < 0) continue

      allHours.push(hours)

      if (!facultyMap.has(apt.facultyId)) {
        facultyMap.set(apt.facultyId, [])
      }
      facultyMap.get(apt.facultyId)!.push(hours)
    }

    if (allHours.length === 0) {
      return { stats: { averageHours: 0, medianHours: 0, fastestHours: 0, slowestHours: 0, totalResponded: 0 }, byFaculty: [], distribution: [] }
    }

    const sorted = [...allHours].sort((a, b) => a - b)

    const avg = allHours.reduce((s, h) => s + h, 0) / allHours.length
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2

    const stats: ResponseTimeStats = {
      averageHours: Math.round(avg * 100) / 100,
      medianHours: Math.round(median * 100) / 100,
      fastestHours: Math.round(sorted[0] * 100) / 100,
      slowestHours: Math.round(sorted[sorted.length - 1] * 100) / 100,
      totalResponded: allHours.length,
    }

    const byFaculty: FacultyResponseTime[] = Array.from(facultyMap.entries()).map(([facultyId, hours]) => {
      const fsorted = [...hours].sort((a, b) => a - b)
      const fmid = Math.floor(fsorted.length / 2)
      const fmedian = fsorted.length % 2 !== 0 ? fsorted[fmid] : (fsorted[fmid - 1] + fsorted[fmid]) / 2
      return {
        facultyId,
        facultyName: facultyNameMap.get(facultyId) || "Unknown",
        averageHours: Math.round((hours.reduce((s, h) => s + h, 0) / hours.length) * 100) / 100,
        medianHours: Math.round(fmedian * 100) / 100,
        fastestHours: Math.round(Math.min(...hours) * 100) / 100,
        slowestHours: Math.round(Math.max(...hours) * 100) / 100,
        totalResponded: hours.length,
      }
    })

    const buckets: { fromHours: number; toHours: number | null; label: string }[] = [
      { fromHours: 0, toHours: 1, label: "< 1 hour" },
      { fromHours: 1, toHours: 3, label: "1 - 3 hours" },
      { fromHours: 3, toHours: 6, label: "3 - 6 hours" },
      { fromHours: 6, toHours: 12, label: "6 - 12 hours" },
      { fromHours: 12, toHours: 24, label: "12 - 24 hours" },
      { fromHours: 24, toHours: 48, label: "24 - 48 hours" },
      { fromHours: 48, toHours: 72, label: "2 - 3 days" },
      { fromHours: 72, toHours: 168, label: "3 - 7 days" },
      { fromHours: 168, toHours: null, label: "> 7 days" },
    ]

    const distribution: ResponseTimeDistribution[] = buckets.map((bucket) => ({
      ...bucket,
      count: allHours.filter((h) =>
        bucket.toHours === null ? h >= bucket.fromHours : h >= bucket.fromHours && h < bucket.toHours
      ).length,
    }))

    return { stats, byFaculty, distribution }
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

  async getConsultationCoverageData(departmentId, filters?) {
    const students = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("STUDENT"))

    const studentIds = students.map((s) => s.id)
    if (studentIds.length === 0) {
      const dept = await supabase.from("departments").select("name").eq("id", departmentId).single()
      const deptName = (dept.data as DbRecord)?.name as string || "Unknown"
      return {
        overall: { totalStudents: 0, studentsWithConsultations: 0, studentsWithoutConsultations: 0, coveragePercentage: 0 },
        byDepartment: [{ departmentId, departmentName: deptName, totalStudents: 0, studentsWithConsultations: 0, studentsWithoutConsultations: 0, coveragePercentage: 0 }],
        trend: [],
        departmentName: deptName,
      }
    }

    let aptQuery = supabase
      .from("appointments")
      .select("studentId, date")
      .eq("meetingType", "CONSULTATION")
      .in("studentId", studentIds)

    if (filters?.startDate) {
      aptQuery = aptQuery.gte("date", filters.startDate)
    }
    if (filters?.endDate) {
      aptQuery = aptQuery.lte("date", filters.endDate)
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
      aptQuery = aptQuery.eq("status", dbStatus)
    } else {
      aptQuery = aptQuery.in("status", ["COMPLETED", "APPROVED"])
    }

    const { data: appointments, error: aptError } = await aptQuery
    if (aptError) throw aptError

    const consultedStudentIds = new Set((appointments || []).map((a: DbRecord) => a.studentId as string))
    const studentsWithConsultations = consultedStudentIds.size
    const totalStudents = studentIds.length
    const studentsWithoutConsultations = totalStudents - studentsWithConsultations
    const coveragePercentage = totalStudents > 0 ? Math.round((studentsWithConsultations / totalStudents) * 100) : 0

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"]

    const monthMap = new Map<string, Set<string>>()
    for (const apt of (appointments || []) as DbRecord[]) {
      const month = (apt.date as string).substring(0, 7)
      if (!monthMap.has(month)) {
        monthMap.set(month, new Set())
      }
      monthMap.get(month)!.add(apt.studentId as string)
    }

    const cumulativeConsulted = new Set<string>()
    const trend: CoverageTrendEntry[] = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, ids]) => {
        for (const id of ids) {
          cumulativeConsulted.add(id)
        }
        const [yearStr, monthNum] = month.split("-")
        return {
          month,
          monthName: monthNames[parseInt(monthNum, 10) - 1],
          year: parseInt(yearStr, 10),
          totalStudents,
          studentsWithConsultations: cumulativeConsulted.size,
          coveragePercentage: Math.round((cumulativeConsulted.size / totalStudents) * 100),
        }
      })

    const dept = await supabase.from("departments").select("name").eq("id", departmentId).single()
    const deptName = (dept.data as DbRecord)?.name as string || "Unknown"

    const coverageData: CoverageData = {
      totalStudents,
      studentsWithConsultations,
      studentsWithoutConsultations,
      coveragePercentage,
    }

    return {
      overall: coverageData,
      byDepartment: [{ ...coverageData, departmentId, departmentName: deptName }],
      trend,
      departmentName: deptName,
    }
  },

  async getWorkloadDistribution(departmentId, filters?) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY") || u.role.includes("DEAN"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    const dept = await supabase.from("departments").select("name").eq("id", departmentId).single()
    const departmentName = (dept.data as DbRecord)?.name as string || "Unknown"

    if (facultyIds.length === 0) {
      return { entries: [], departmentTotal: 0, departmentName }
    }

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

    const statsMap = new Map<string, WorkloadDistributionEntry>()
    for (const faculty of facultyUsers) {
      statsMap.set(faculty.id, {
        facultyId: faculty.id,
        facultyName: faculty.name,
        departmentId,
        departmentName,
        total: 0,
        completed: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        cancelled: 0,
        completionRate: 0,
        departmentShare: 0,
      })
    }

    for (const apt of (appointments || []) as DbRecord[]) {
      const stat = statsMap.get(apt.facultyId as string)
      if (!stat) continue
      stat.total++
      switch (apt.status) {
        case "COMPLETED": stat.completed++; break
        case "PENDING": stat.pending++; break
        case "APPROVED": stat.approved++; break
        case "REJECTED": stat.rejected++; break
        case "CANCELLED": stat.cancelled++; break
      }
    }

    const departmentTotal = Array.from(statsMap.values()).reduce((s, e) => s + e.total, 0)

    const entries = Array.from(statsMap.values()).map((e) => ({
      ...e,
      completionRate: e.total > 0 ? Math.round((e.completed / e.total) * 100) : 0,
      departmentShare: departmentTotal > 0 ? Math.round((e.total / departmentTotal) * 100) : 0,
    }))

    return { entries, departmentTotal, departmentName }
  },
}
