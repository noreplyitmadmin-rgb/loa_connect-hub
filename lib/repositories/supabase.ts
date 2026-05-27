import { supabase } from "@/lib/supabase"
import type {
  AppointmentAttendeeData, AppointmentTimeSlotData,
  UserData, DepartmentData, AvailabilityRuleData,
  PasswordResetTokenData, AuditLogData,
  AppointmentFileData, FacultyStatsData,
  IUserRepository, IDepartmentRepository, IAppointmentRepository,
  IAvailabilityRuleRepository, IPasswordResetTokenRepository, IAuditLogRepository, IReportsRepository,
} from "./interfaces"

const USER_SELECT = "*, userrole(roleName)"

function toUserWithRole(item: any): UserData {
  const roles = item.userrole?.map((r: any) => r.roleName) || []
  const { userrole, ...rest } = item
  return { ...rest, role: roles.length > 0 ? roles.join("|") : "GUEST" } as UserData
}

function toUsersWithRoles(items: any[]): UserData[] {
  return (items || []).map(toUserWithRole)
}

async function singleQuery<T>(builder: any): Promise<T | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return data as T
}

async function singleQueryWithRoles(builder: any): Promise<UserData | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null
    throw error
  }
  return toUserWithRole(data)
}

/**
 * Execute a query with userrole embedding. If the userrole table doesn't
 * exist yet (migration not run), fall back to selecting without roles.
 */
function isMissingUserrole(err: any): boolean {
  return err?.message?.includes('relation "userrole" does not exist') || err?.message?.includes('"userrole"')
}

export const userRepository: IUserRepository = {
  async findByEmail(email) {
    try {
      return await singleQueryWithRoles(supabase.from("users").select(USER_SELECT).eq("email", email))
    } catch (err) {
      if (isMissingUserrole(err)) {
        const { data } = await supabase.from("users").select("*").eq("email", email).single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },
  async findById(id) {
    try {
      return await singleQueryWithRoles(supabase.from("users").select(USER_SELECT).eq("id", id))
    } catch (err) {
      if (isMissingUserrole(err)) {
        const { data } = await supabase.from("users").select("*").eq("id", id).single()
        return data ? { ...data, role: "GUEST" } as UserData : null
      }
      throw err
    }
  },
  async create(input) {
    const { role, ...userFields } = input as any
    const { data, error } = await supabase.from("users").insert(userFields).select("*").single()
    if (error) throw error

    // Insert role(s)
    if (role) {
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: data.id, roleName })
        if (roleErr) throw roleErr
      }
    }

    // Re-fetch with roles attached
    const { data: withRoles } = await supabase.from("users").select(USER_SELECT).eq("id", data.id).single()
    return toUserWithRole(withRoles)
  },
  async listByRole(role) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select(USER_SELECT)
        .eq("userrole.roleName", role)
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err)) {
        console.warn("[repo] userrole table not found — listByRole returns empty")
        return []
      }
      throw err
    }
  },
  async listByDepartment(departmentId) {
    try {
      const { data, error } = await supabase.from("users").select(USER_SELECT).eq("departmentId", departmentId)
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err)) {
        const { data } = await supabase.from("users").select("*").eq("departmentId", departmentId)
        return (data || []).map((u: any) => ({ ...u, role: "GUEST" })) as UserData[]
      }
      throw err
    }
  },
  async listByIds(ids) {
    try {
      const { data, error } = await supabase.from("users").select(USER_SELECT).in("id", ids)
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err)) {
        const { data } = await supabase.from("users").select("*").in("id", ids)
        return (data || []).map((u: any) => ({ ...u, role: "GUEST" })) as UserData[]
      }
      throw err
    }
  },
  async listAll() {
    try {
      const { data, error } = await supabase.from("users").select(USER_SELECT).order("createdAt", { ascending: false })
      if (error) throw error
      return toUsersWithRoles(data)
    } catch (err) {
      if (isMissingUserrole(err)) {
        const { data } = await supabase.from("users").select("*").order("createdAt", { ascending: false })
        return (data || []).map((u: any) => ({ ...u, role: "GUEST" })) as UserData[]
      }
      throw err
    }
  },
  async update(id, data) {
    const { role, ...userFields } = data as any
    // Update user fields (without role)
    if (Object.keys(userFields).length > 0) {
      const { error } = await supabase.from("users").update(userFields).eq("id", id)
      if (error) throw error
    }
    // Update roles if provided
    if (role) {
      // Delete existing roles and re-insert
      const { error: delErr } = await supabase.from("userrole").delete().eq("userId", id)
      if (delErr) throw delErr
      const roleNames = role.split("|")
      for (const roleName of roleNames) {
        const { error: roleErr } = await supabase.from("userrole").insert({ userId: id, roleName })
        if (roleErr) throw roleErr
      }
    }
    // Re-fetch with roles
    const { data: updated, error: fetchErr } = await supabase.from("users").select(USER_SELECT).eq("id", id).single()
    if (fetchErr) throw fetchErr
    return toUserWithRole(updated)
  },
}

export const departmentRepository: IDepartmentRepository = {
  async listAll() {
    const { data, error } = await supabase.from("departments").select("*")
    if (error) throw error
    return data as DepartmentData[]
  },
  async findById(id) {
    return singleQuery<DepartmentData>(supabase.from("departments").select("*").eq("id", id))
  },
  async findByDeanId(deanId) {
    const { data, error } = await supabase.from("departments").select("*").eq("deanId", deanId)
    if (error) throw error
    return (data?.[0] as DepartmentData) ?? null
  },
  async create(data) {
    const { data: created, error } = await supabase.from("departments").insert(data).select("*").single()
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
    return data as any
  },
  async listByStudent(studentId) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("studentId", studentId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as any
  },
  async listByFaculty(facultyId) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("facultyId", facultyId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as any
  },
  async listByParticipant(userId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select(`appointment:appointments!inner(${appointmentSelect.trim()})`)
      .eq("userId", userId)
    if (error) throw error
    return (data || []).map((record: any) => record.appointment) as any
  },
  async listAll() {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
    if (error) throw error
    return data as any
  },
  async listPendingSync() {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("status", "APPROVED")
      .eq("teamsSyncStatus", "UNWRITTEN")
      .order("updatedAt", { ascending: true })
    if (error) throw error
    return data as any
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
    return data as any
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("appointments")
      .update(data)
      .eq("id", id)
      .select(appointmentSelect)
      .single()
    if (error) throw error
    return updated as any
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
    return data as any
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
    return data as any
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
    return data as any
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
    return data as any
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
    return data as any
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

    const facultyIds = (facultyUsers || []).map((u: any) => u.id)
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
      statsMap.set((faculty as any).id, {
        facultyId: (faculty as any).id,
        facultyName: (faculty as any).name,
        total: 0,
        completed: 0,
        pending: 0,
        cancelled: 0,
        completionRate: 0,
      })
    }

    for (const apt of (appointments || []) as any[]) {
      const stat = statsMap.get(apt.facultyId)
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

    const facultyIds = (facultyUsers || []).map((u: any) => u.id)
    if (facultyIds.length === 0) return []

    const facultyNameMap = new Map((facultyUsers || []).map((u: any) => [u.id, u.name]))

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

    return ((appointments || []) as any[]).map((apt: any) => ({
      id: apt.id,
      facultyId: apt.facultyId,
      facultyName: facultyNameMap.get(apt.facultyId) || "Unknown",
      studentName: apt.student?.name || "Unknown",
      date: apt.date,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      title: apt.title,
    }))
  },
}
