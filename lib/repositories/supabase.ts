import { supabase } from "@/lib/supabase"
import type {
  AppointmentAttendeeData, AppointmentTimeSlotData, AppointmentData,
  UserData, DepartmentData, AvailabilityRuleData,
  PasswordResetTokenData, AuditLogData,
  AppointmentFileData, FacultyStatsData,
  IUserRepository, IDepartmentRepository, IAppointmentRepository,
  IAvailabilityRuleRepository, IPasswordResetTokenRepository, IAuditLogRepository, IReportsRepository,
} from "./interfaces"

interface QueryError {
  code?: string
  message?: string
}

interface SingleBuilder {
  single(): Promise<{ data: unknown; error: QueryError | null }>
}

type DbRecord = Record<string, unknown>

const USER_SELECT = "*, userrole(roleName)"

function toUserWithRole(item: Record<string, unknown>): UserData {
  const roleArr = (item.userrole as Array<{ roleName: string }>) || []
  const roles = roleArr.map((r) => r.roleName)
  const role = roles.length > 0 ? roles.join("|") : "GUEST"
  return { ...item, role } as unknown as UserData
}

function toUsersWithRoles(items: DbRecord[]): UserData[] {
  return (items || []).map(toUserWithRole)
}

async function singleQuery<T>(builder: SingleBuilder): Promise<T | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data as T
}

async function singleQueryWithRoles(builder: SingleBuilder): Promise<UserData | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return toUserWithRole(data as DbRecord)
}

function isMissingUserrole(err: QueryError): boolean {
  return !!(err?.message?.includes('relation "userrole" does not exist') || err?.message?.includes('"userrole"'))
}

export const userRepository: IUserRepository = {
  async findByEmail(email) {
    try {
      return await singleQueryWithRoles(
        supabase.from("users").select(USER_SELECT).eq("email", email) as unknown as SingleBuilder
      )
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").eq("email", email).single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },
  async findById(id) {
    try {
      return await singleQueryWithRoles(
        supabase.from("users").select(USER_SELECT).eq("id", id) as unknown as SingleBuilder
      )
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").eq("id", id).single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },
  async create(input) {
    const { role, ...userFields } = input
    const { data, error } = await supabase.from("users").insert(userFields).select("*").single()
    if (error) throw error

    if (role) {
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: data.id, roleName })
        if (roleErr) throw roleErr
      }
    }

    const { data: withRoles } = await supabase.from("users").select(USER_SELECT).eq("id", data.id).single()
    return toUserWithRole(withRoles)
  },
  async listByRole(role, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).eq("userrole.roleName", role)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        console.warn("[repo] userrole table not found — listByRole returns empty")
        return []
      }
      throw err
    }
  },
  async listByDepartment(departmentId, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).eq("departmentId", departmentId)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").eq("departmentId", departmentId)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async listByIds(ids, options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).in("id", ids)
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").in("id", ids)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async listAll(options) {
    try {
      let query = supabase.from("users").select(USER_SELECT).order("createdAt", { ascending: false })
      if (!options?.includeDeleted) {
        query = query.is("deletedAt", null)
      }
      const { data, error } = await query
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        let query = supabase.from("users").select("*").order("createdAt", { ascending: false })
        if (!options?.includeDeleted) {
          query = query.is("deletedAt", null)
        }
        const { data } = await query
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
  async update(id, data) {
    const { role, ...userFields } = data
    if (Object.keys(userFields).length > 0) {
      const { error } = await supabase.from("users").update(userFields).eq("id", id)
      if (error) throw error
    }
    if (role) {
      const { error: delErr } = await supabase.from("userrole").delete().eq("userId", id)
      if (delErr) throw delErr
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: id, roleName })
        if (roleErr) throw roleErr
      }
    }
    const { data: updated, error: fetchErr } = await supabase.from("users").select(USER_SELECT).eq("id", id).single()
    if (fetchErr) throw fetchErr
    return toUserWithRole(updated)
  },
  async softDelete(id) {
    const { error } = await supabase.from("users").update({ deletedAt: new Date().toISOString() }).eq("id", id)
    if (error) throw error
  },
  async restore(id) {
    const { error } = await supabase.from("users").update({ deletedAt: null }).eq("id", id)
    if (error) throw error
  },
  async permanentDelete(id) {
    const { error } = await supabase.from("users").delete().eq("id", id)
    if (error) throw error
  },
  async listDeleted() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(USER_SELECT)
        .not("deletedAt", "is", null)
        .order("deletedAt", { ascending: false })
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err as QueryError)) {
        const { data } = await supabase.from("users").select("*").not("deletedAt", "is", null)
        return (data || []).map((u: DbRecord) => ({ ...u, role: "GUEST" })) as unknown as UserData[]
      }
      throw err
    }
  },
}

export const departmentRepository: IDepartmentRepository = {
  async listAll() {
    const { data, error } = await supabase.from("departments").select("*")
    if (error) throw error
    return data as DepartmentData[]
  },
  async findById(id) {
    return singleQuery<DepartmentData>(supabase.from("departments").select("*").eq("id", id) as unknown as SingleBuilder)
  },
  async findByDeanId(deanId) {
    const { data, error } = await supabase.from("departments").select("*").eq("deanId", deanId)
    if (error) throw error
    return (data?.[0] as DepartmentData) ?? null
  },
  async create(data) {
    const { data: created, error } = await supabase.from("departments").insert({ ...data, isDisabled: false }).select("*").single()
    if (error) throw error
    return created as DepartmentData
  },
  async update(id, data) {
    const { data: updated, error } = await supabase.from("departments").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as DepartmentData
  },
}

const appointmentSelect = `
  *,
  student:users!appointments_studentId_fkey(*),
  faculty:users!appointments_facultyId_fkey(*),
  attendees:appointment_attendees(*, user:users(*)),
  timeSlots:appointment_time_slots(*)
`

export const appointmentRepository: IAppointmentRepository = {
  async create(input) {
    const { data, error } = await supabase.from("appointments").insert(input).select(appointmentSelect).single()
    if (error) throw error
    return data as unknown as AppointmentData
  },
  async listByStudent(studentId) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("studentId", studentId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as unknown as AppointmentData[]
  },
  async listByFaculty(facultyId) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("facultyId", facultyId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as unknown as AppointmentData[]
  },
  async listByParticipant(userId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select(`appointment:appointments!inner(${appointmentSelect.trim()})`)
      .eq("userId", userId)
    if (error) throw error
    return ((data || []) as unknown as DbRecord[]).map((record: DbRecord) => record.appointment) as unknown as AppointmentData[]
  },
  async listAll() {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as unknown as AppointmentData[]
  },
  async listPendingSync() {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("status", "APPROVED")
      .eq("teamsSyncStatus", "UNWRITTEN")
      .order("updatedAt", { ascending: true })
    if (error) throw error
    return data as unknown as AppointmentData[]
  },
  async findById(id) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("id", id)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as unknown as AppointmentData
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("appointments")
      .update(data)
      .eq("id", id)
      .select(appointmentSelect)
      .single()
    if (error) throw error
    return updated as unknown as AppointmentData
  },
  async addAttendee(appointmentId, userId, isMandatory = true) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .insert({ appointmentId: appointmentId, userId, isMandatory })
      .select("*")
      .single()
    if (error) throw error
    return data as AppointmentAttendeeData
  },
  async listAttendees(appointmentId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select("*, user:users(*)")
      .eq("appointmentId", appointmentId)
    if (error) throw error
    return data as unknown as AppointmentAttendeeData[]
  },
  async updateAttendeeStatus(appointmentId, userId, status) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .update({ status })
      .eq("appointmentId", appointmentId)
      .eq("userId", userId)
      .select("*, user:users(*)")
      .single()
    if (error) throw error
    return data as unknown as AppointmentAttendeeData
  },
  async addTimeSlot(appointmentId, date, startTime, endTime) {
    const { data, error } = await supabase
      .from("appointment_time_slots")
      .insert({ appointmentId: appointmentId, date, startTime, endTime })
      .select("*")
      .single()
    if (error) throw error
    return data as AppointmentTimeSlotData
  },
  async removeTimeSlot(slotId) {
    const { error } = await supabase
      .from("appointment_time_slots")
      .delete()
      .eq("id", slotId)
    if (error) throw error
  },
  async updateTimeSlot(id, data) {
    const { data: result, error } = await supabase
      .from("appointment_time_slots")
      .update(data)
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw error
    return result as AppointmentTimeSlotData
  },
  async findTimeSlotById(id) {
    const { data, error } = await supabase
      .from("appointment_time_slots")
      .select("*")
      .eq("id", id)
      .single()
    if (error) return null
    return data as AppointmentTimeSlotData
  },
  async listTimeSlots(appointmentId) {
    const { data, error } = await supabase
      .from("appointment_time_slots")
      .select("*")
      .eq("appointmentId", appointmentId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as AppointmentTimeSlotData[]
  },
  async listStudentConflictingSlots(studentId, date, startTime, endTime, excludeSessionGroupId) {
    let query = supabase
      .from("appointment_time_slots")
      .select("*, appointment:appointments(*)")
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      .eq("appointment.studentId", studentId)
      .eq("appointment.meetingType", "CONSULTATION")
      .in("appointment.status", ["PENDING", "APPROVED"])
    if (excludeSessionGroupId) {
      query = query.neq("appointment.sessionGroupId", excludeSessionGroupId)
    }
    const { data, error } = await query
    if (error) throw error
    return data as unknown as AppointmentTimeSlotData[]
  },
  // async listConflictingSlots(facultyIds, date, startTime, endTime) {
  //   const { data, error } = await supabase
  //     .from("appointment_time_slots")
  //     .select("*, appointment:appointments(*)")
  //     .eq("date", date)
  //     .lt("startTime", endTime)
  //     .gt("endTime", startTime)
  //   if (error) throw error
  //   return data as any
  // },
  async listConflictingSlots(facultyIds: string[], date: string, startTime: string, endTime: string) {
    const { data, error } = await supabase
      .from("appointment_time_slots")
      // We use !inner to force an INNER JOIN so we can filter by facultyId
      .select("*, appointment:appointments!inner(*)")
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      // Now we can actually use the facultyIds parameter!
      .in("appointment.facultyId", facultyIds) 

    if (error) throw error
    return data as unknown as AppointmentTimeSlotData[]
  },
  async addFile(appointmentId, data) {
    const { data: result, error } = await supabase
      .from("appointment_files")
      .insert({ appointmentId, ...data })
      .select("*")
      .single()
    if (error) throw error
    return result as AppointmentFileData
  },
  async listFiles(appointmentId) {
    const { data, error } = await supabase
      .from("appointment_files")
      .select("*")
      .eq("appointmentId", appointmentId)
      .order("createdAt", { ascending: true })
    if (error) throw error
    return (data || []) as AppointmentFileData[]
  },
  async listFacultyAppointmentsByDateRange(facultyId, startDate, endDate, status) {
    let query = supabase
      .from("appointments")
      .select("date, startTime, endTime")
      .eq("facultyId", facultyId)
      .gte("date", startDate)
      .lte("date", endDate)
    if (status) {
      query = query.eq("status", status)
    }
    const { data, error } = await query.order("date", { ascending: true }).order("startTime", { ascending: true })
    if (error) throw error
    return data as unknown as AppointmentData[]
  },
}

export const availabilityRuleRepository: IAvailabilityRuleRepository = {
  async listByFaculty(facultyId) {
    const { data, error } = await supabase
      .from("faculty_availability_rules")
      .select("*")
      .eq("facultyId", facultyId)
      .order("dayOfWeek", { ascending: true })
    if (error) throw error
    return data as AvailabilityRuleData[]
  },
  async findByFacultyAndDay(facultyId, dayOfWeek, startDate) {
    if (!startDate) return null
    const { data, error } = await supabase
      .from("faculty_availability_rules")
      .select("*")
      .eq("facultyId", facultyId)
      .eq("dayOfWeek", dayOfWeek)
      .eq("startDate", startDate)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as AvailabilityRuleData
  },
  async upsert(input) {
    const { facultyId, dayOfWeek, startDate } = input
    const existing = await this.findByFacultyAndDay(facultyId, dayOfWeek, startDate)
    if (existing) {
      const { data, error } = await supabase
        .from("faculty_availability_rules")
        .update({
          isBlocked: input.isBlocked,
          startTime: input.startTime ?? null,
          endTime: input.endTime ?? null,
          endDate: input.endDate ?? null,
        })
        .eq("id", existing.id)
        .select("*")
        .single()
      if (error) throw error
      return data as AvailabilityRuleData
    }
    const { data, error } = await supabase
      .from("faculty_availability_rules")
      .insert({
        facultyId,
        dayOfWeek,
        isBlocked: input.isBlocked,
        startTime: input.startTime ?? null,
        endTime: input.endTime ?? null,
        startDate,
        endDate: input.endDate ?? null,
      })
      .select("*")
      .single()
    if (error) throw error
    return data as AvailabilityRuleData
  },
  async delete(id) {
    const { error } = await supabase.from("faculty_availability_rules").delete().eq("id", id)
    if (error) throw error
  },
}

export const passwordResetTokenRepository: IPasswordResetTokenRepository = {
  async create(email, token, expiresAt) {
    const { error } = await supabase
      .from("password_reset_tokens")
      .insert({ email, token, expiresAt: expiresAt.toISOString() })
    if (error) throw error
  },
  async findByToken(token) {
    const { data, error } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("token", token)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as PasswordResetTokenData
  },
  async markUsed(id) {
    const { error } = await supabase
      .from("password_reset_tokens")
      .update({ usedAt: new Date().toISOString() })
      .eq("id", id)
    if (error) throw error
  },
  async findByEmail(email) {
    const { data, error } = await supabase
      .from("password_reset_tokens")
      .select("*")
      .eq("email", email)
      .order("createdAt", { ascending: false })
      .limit(1)
    if (error) throw error
    return (data?.[0] as PasswordResetTokenData) ?? null
  },
}

export const auditLogRepository: IAuditLogRepository = {
  async create(data) {
    const { data: log, error } = await supabase
      .from("audit_logs")
      .insert(data)
      .select("*")
      .single()
    if (error) throw error
    return log as AuditLogData
  },
  async list(limit = 100) {
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("createdAt", { ascending: false })
      .limit(limit)
    if (error) throw error
    return data as AuditLogData[]
  },
}

export const reportsRepository: IReportsRepository = {
  async getDepartmentConsultationStats(departmentId, filters) {
    // 1. Fetch all FACULTY users in this department
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY"))
      .map(({ id, name }) => ({ id, name }))

    const facultyIds = facultyUsers.map((u) => u.id)
    if (facultyIds.length === 0) return []

    // 2. Build the appointments query for CONSULTATION type
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

    // 3. Aggregate in TypeScript
    const statsMap = new Map<string, FacultyStatsData>()

    for (const faculty of facultyUsers || []) {
      statsMap.set(faculty.id, {
        facultyId: faculty.id,
        facultyName: faculty.name,
        total: 0,
        completed: 0,
        pending: 0,
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
        case "APPROVED":
          stat.pending++
          break
        case "CANCELLED":
          stat.cancelled++
          break
      }
    }

    // Calculate completion rate for each faculty member
    for (const stat of statsMap.values()) {
      stat.completionRate = stat.total > 0
        ? Math.round((stat.completed / stat.total) * 100)
        : 0
    }

    return Array.from(statsMap.values())
  },

  async getDepartmentConsultationAppointments(departmentId, filters) {
    const facultyUsers = (await userRepository.listByDepartment(departmentId))
      .filter((u) => u.role.includes("FACULTY"))
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
