import { supabase } from "@/lib/supabase"
import type {
  IUserRepository,
  IDepartmentRepository,
  IAppointmentRepository,
  IAvailabilityRuleRepository,
  IMeetingRepository,
  IPasswordResetTokenRepository,
  IAuditLogRepository,
  UserData,
  CreateUserInput,
  DepartmentData,
  AppointmentData,
  CreateAppointmentInput,
  AppointmentAttendeeData,
  AvailabilityRuleData,
  UpsertAvailabilityRuleInput,
  MeetingData,
  CreateMeetingInput,
  MeetingParticipantData,
  PasswordResetTokenData,
  AuditLogData,
} from "./interfaces"

async function singleQuery<T>(builder: any): Promise<T | null> {
  const { data, error } = await builder.single()
  if (error) {
    if (error.code === "PGRST116") return null // not found
    throw error
  }
  return data as T
}

export const userRepository: IUserRepository = {
  async findByEmail(email) {
    return singleQuery<UserData>(supabase.from("users").select("*").eq("email", email))
  },
  async findById(id) {
    return singleQuery<UserData>(supabase.from("users").select("*").eq("id", id))
  },
  async create(input) {
    const { data, error } = await supabase.from("users").insert(input).select("*").single()
    if (error) throw error
    return data as UserData
  },
  async listByRole(role) {
    const { data, error } = await supabase.from("users").select("*").eq("role", role)
    if (error) throw error
    return data as UserData[]
  },
  async listByDepartment(departmentId) {
    const { data, error } = await supabase.from("users").select("*").eq("departmentId", departmentId)
    if (error) throw error
    return data as UserData[]
  },
  async listAll() {
    const { data, error } = await supabase.from("users").select("*").order("createdAt", { ascending: false })
    if (error) throw error
    return data as UserData[]
  },
  async update(id, data) {
    const { data: updated, error } = await supabase.from("users").update(data).eq("id", id).select("*").single()
    if (error) throw error
    return updated as UserData
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
  attendees:appointment_attendees(*, user:users(*))
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
      .order("requestedAt", { ascending: false })
    if (error) throw error
    return data as any
  },
  async listByFaculty(facultyId) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .eq("facultyId", facultyId)
      .order("requestedAt", { ascending: false })
    if (error) throw error
    return data as any
  },
  async listAll() {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .order("requestedAt", { ascending: false })
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
      .insert({ appointmentId, userId, isMandatory })
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

const meetingSelect = `
  *,
  organizer:users!internal_meetings_organizerId_fkey(*),
  participants:internal_meeting_participants(*, user:users(*))
`

export const meetingRepository: IMeetingRepository = {
  async create(input) {
    const { data, error } = await supabase.from("internal_meetings").insert(input).select(meetingSelect).single()
    if (error) throw error
    return data as any
  },
  async findById(id) {
    const { data, error } = await supabase
      .from("internal_meetings")
      .select(meetingSelect)
      .eq("id", id)
      .single()
    if (error) {
      if (error.code === "PGRST116") return null
      throw error
    }
    return data as any
  },
  async listByOrganizer(organizerId) {
    const { data, error } = await supabase
      .from("internal_meetings")
      .select(meetingSelect)
      .eq("organizerId", organizerId)
      .order("createdAt", { ascending: false })
    if (error) throw error
    return data as any
  },
  async listByParticipant(userId) {
    const { data: participations, error } = await supabase
      .from("internal_meeting_participants")
      .select(`meeting:internal_meetings!inner(${meetingSelect})`)
      .eq("userId", userId)
    if (error) throw error
    return participations.map((p: any) => p.meeting) as any
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("internal_meetings")
      .update(data)
      .eq("id", id)
      .select(meetingSelect)
      .single()
    if (error) throw error
    return updated as any
  },
  async addParticipant(meetingId, userId) {
    const { data, error } = await supabase
      .from("internal_meeting_participants")
      .insert({ meetingId, userId })
      .select("*")
      .single()
    if (error) throw error
    return data as MeetingParticipantData
  },
  async updateParticipantStatus(meetingId, userId, status) {
    const { data, error } = await supabase
      .from("internal_meeting_participants")
      .update({ status })
      .eq("meetingId", meetingId)
      .eq("userId", userId)
      .select("*")
      .single()
    if (error) throw error
    return data as MeetingParticipantData
  },
  async getParticipants(meetingId) {
    const { data, error } = await supabase
      .from("internal_meeting_participants")
      .select("*, user:users(*)")
      .eq("meetingId", meetingId)
    if (error) throw error
    return data as any
  },
  async listConflictingAppointments(facultyId, date, startTime, endTime) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*, student:users!appointments_studentId_fkey(*), faculty:users!appointments_facultyId_fkey(*)")
      .or(`facultyId.eq.${facultyId},studentId.eq.${facultyId}`)
      .in("status", ["PENDING", "APPROVED"])
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
    if (error) throw error
    return data as any
  },
  async listConflictingMeetings(facultyId, date, startTime, endTime) {
    const timeFilter = `and(date.eq.${date},status.eq.CONFIRMED,startTime.lt.${endTime},endTime.gt.${startTime})`
    const [organized, participating] = await Promise.all([
      supabase
        .from("internal_meetings")
        .select(meetingSelect)
        .eq("organizerId", facultyId)
        .eq("date", date)
        .eq("status", "CONFIRMED")
        .lt("startTime", endTime)
        .gt("endTime", startTime),
      supabase
        .from("internal_meeting_participants")
        .select(`meeting:internal_meetings!inner(${meetingSelect})`)
        .eq("userId", facultyId)
        .filter("meeting.date", "eq", date)
        .filter("meeting.status", "eq", "CONFIRMED")
        .filter("meeting.startTime", "lt", endTime)
        .filter("meeting.endTime", "gt", startTime),
    ])
    const { data: orgData, error: orgErr } = organized
    if (orgErr) throw orgErr
    const { data: partData, error: partErr } = participating
    if (partErr) throw partErr
    const merged = [...(orgData || []), ...(partData || []).map((p: any) => p.meeting)]
    const seen = new Set<string>()
    return merged.filter((m: any) => {
      if (seen.has(m.id)) return false
      seen.add(m.id)
      return true
    }) as any
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
