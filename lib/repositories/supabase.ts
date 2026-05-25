import { supabase } from "@/lib/supabase"
import type {
  AppointmentData, AppointmentAttendeeData, AppointmentTimeSlotData,
  MeetingData, MeetingParticipantData, UserData,
  DepartmentData, AvailabilityRuleData,
  PasswordResetTokenData, AuditLogData,
  CreateAppointmentInput, CreateUserInput, CreateMeetingInput,
  AppointmentFileData,
  IUserRepository, IDepartmentRepository, IAppointmentRepository,
  IMeetingRepository, IAvailabilityRuleRepository,
  IPasswordResetTokenRepository, IAuditLogRepository,
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
  async listByIds(ids) {
    const { data, error } = await supabase.from("users").select("*").in("id", ids)
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
}

const meetingSelect = `
  *,
  organizer:users!internal_meetings_organizerId_fkey(*),
  participants:internal_meeting_participants(*, user:users(*))
`

function mapAppointmentToMeetingData(appointment: any) {
  const participants = (appointment.attendees || []).map((att: any) => ({
    id: att.id,
    meetingId: appointment.id,
    userId: att.userId,
    status: (att.status === "ACCEPTED" ? "ACCEPTED" : att.status === "DECLINED" ? "DECLINED" : "PENDING") as any,
    user: att.user,
  }))

  return {
    id: appointment.id,
    title: appointment.title,
    description: appointment.description,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    organizerId: appointment.facultyId || appointment.studentId,
    teamsEventId: null,
    teamsLink: appointment.teamsLink,
    status: (appointment.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED") as any,
    createdAt: new Date(appointment.requestedAt),
    organizer: appointment.faculty || appointment.student || null,
    participants,
  }
}

export const meetingRepository: IMeetingRepository = {
  async create(input) {
    const { data, error } = await supabase.from("internal_meetings").insert(input).select(meetingSelect).single()
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
    return mapAppointmentToMeetingData(data)
  },
  async listByOrganizer(organizerId) {
    const [studentResult, facultyResult] = await Promise.all([
      supabase
        .from("appointments")
        .select(appointmentSelect)
        .eq("studentId", organizerId)
        .order("requestedAt", { ascending: false }),
      supabase
        .from("appointments")
        .select(appointmentSelect)
        .eq("facultyId", organizerId)
        .order("requestedAt", { ascending: false }),
    ])
    if (studentResult.error) throw studentResult.error
    if (facultyResult.error) throw facultyResult.error
    const merged = [...(studentResult.data || []), ...(facultyResult.data || [])]
    const seen = new Set<string>()
    return merged
      .filter((appointment: any) => {
        if (seen.has(appointment.id)) return false
        seen.add(appointment.id)
        return true
      })
      .map(mapAppointmentToMeetingData)
  },
  async listByParticipant(userId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select(`appointment:appointments!inner(*, student:users!appointments_studentId_fkey(*), faculty:users!appointments_facultyId_fkey(*), attendees:appointment_attendees(*, user:users(*)))`)
      .eq("userId", userId)
    if (error) throw error
    return data.map((record: any) => mapAppointmentToMeetingData(record.appointment))
  },
  async update(id, data) {
    const { data: updated, error } = await supabase
      .from("appointments")
      .update(data)
      .eq("id", id)
      .select(appointmentSelect)
      .single()
    if (error) throw error
    return mapAppointmentToMeetingData(updated)
  },
  async addParticipant(meetingId, userId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .insert({ appointmentId: meetingId, userId })
      .select("*, user:users(*)")
      .single()
    if (error) throw error
    return {
      id: data.id,
      meetingId: data.appointmentId,
      userId: data.userId,
      status: data.status,
      user: data.user,
    } as MeetingParticipantData
  },
  async updateParticipantStatus(meetingId, userId, status) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .update({ status })
      .eq("appointmentId", meetingId)
      .eq("userId", userId)
      .select("*, user:users(*)")
      .single()
    if (error) throw error
    return {
      id: data.id,
      meetingId: data.appointmentId,
      userId: data.userId,
      status: data.status,
      user: data.user,
    } as MeetingParticipantData
  },
  async getParticipants(meetingId) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select("*, user:users(*)")
      .eq("appointmentId", meetingId)
    if (error) throw error
    return data.map((att: any) => ({
      id: att.id,
      meetingId: att.appointmentId,
      userId: att.userId,
      status: att.status,
      user: att.user,
    })) as any
  },
  async listConflictingAppointments(facultyId, date, startTime, endTime) {
    const { data: slots, error: slotsError } = await supabase
      .from("appointment_time_slots")
      .select("*, appointment:appointments(*, student:users!appointments_studentId_fkey(*), faculty:users!appointments_facultyId_fkey(*))")
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
    if (slotsError) throw slotsError
    const conflictingAppointments = slots
      ?.filter((slot: any) => {
        const apt = slot.appointment
        return apt && apt.status !== "REJECTED" && apt.status !== "CANCELLED" &&
               (apt.facultyId === facultyId || apt.studentId === facultyId)
      })
      .map((slot: any) => slot.appointment)
      .filter((apt: any, idx: number, arr: any[]) => arr.findIndex(a => a.id === apt.id) === idx)
    return conflictingAppointments || []
  },
  async listConflictingMeetings(facultyId, date, startTime, endTime) {
    const slots = await appointmentRepository.listConflictingSlots([facultyId], date, startTime, endTime)
    const appointments = (slots || [])
      .map((slot: any) => slot.appointment)
      .filter((apt: any) => apt && (apt.facultyId === facultyId || apt.studentId === facultyId))
      .filter((apt: any, idx: number, arr: any[]) => arr.findIndex(a => a.id === apt.id) === idx)
    return appointments.map(mapAppointmentToMeetingData)
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
