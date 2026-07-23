import { supabase } from "@/lib/db"
import type {
  AppointmentData, AppointmentAttendeeData, AppointmentTimeSlotData, AppointmentFileData,
  IAppointmentRepository,
} from "@/lib/types"
import { appointmentSelect, appointmentSelectHistory, USER_BRIEF } from "@/lib/db/common"
import type { DbRecord } from "@/lib/db/common"
import { logAuditEvent } from "@/lib/services/audit"

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 50

// Helper to log appointment operations
async function logAppointmentAction(email: string | null, action: string, details?: string) {
  await logAuditEvent({ email: email || undefined, action, details })
}

export const appointmentRepository: IAppointmentRepository = {
  async create(input) {
    const { data, error } = await supabase.from("appointments").insert(input).select(appointmentSelect).single()
    if (error) throw error
    const appt = data as unknown as AppointmentData
    await logAppointmentAction(input.createdByEmail, "CREATE_APPOINTMENT", `Created consultation: ${appt.title || "Untitled"} on ${appt.date}`)
    return appt
  },
  async listByStudent(studentId, pagination) {
    const page = Math.max(1, pagination?.page ?? DEFAULT_PAGE)
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? DEFAULT_LIMIT))
    const { data, error, count } = await supabase
      .from("appointments")
      .select(appointmentSelectHistory, { count: "exact" })
      .eq("studentId", studentId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error
    return {
      data: (data || []) as unknown as AppointmentData[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  },
  async listByFaculty(facultyId, pagination) {
    const page = Math.max(1, pagination?.page ?? DEFAULT_PAGE)
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? DEFAULT_LIMIT))
    const { data, error, count } = await supabase
      .from("appointments")
      .select(appointmentSelect, { count: "exact" })
      .eq("facultyId", facultyId)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error
    return {
      data: (data || []) as unknown as AppointmentData[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  },
  async listByParticipant(userId, pagination) {
    const page = Math.max(1, pagination?.page ?? DEFAULT_PAGE)
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? DEFAULT_LIMIT))
    const { data, error, count } = await supabase
      .from("appointment_attendees")
      .select(`appointment:appointments!inner(${appointmentSelect.trim()})`, { count: "exact" })
      .eq("userId", userId)
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error
    const records = ((data || []) as unknown as DbRecord[]).map((record: DbRecord) => record.appointment) as unknown as AppointmentData[]
    return {
      data: records,
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
  },
  async listAll(pagination) {
    const page = Math.max(1, pagination?.page ?? DEFAULT_PAGE)
    const limit = Math.min(100, Math.max(1, pagination?.limit ?? DEFAULT_LIMIT))
    const { data, error, count } = await supabase
      .from("appointments")
      .select(appointmentSelect, { count: "exact" })
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
      .range((page - 1) * limit, page * limit - 1)
    if (error) throw error
    return {
      data: (data || []) as unknown as AppointmentData[],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    }
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
    const appt = updated as unknown as AppointmentData
    const changes = Object.keys(data).join(", ")
    await logAppointmentAction(appt.createdByEmail, "UPDATE_APPOINTMENT", `Updated consultation status to ${data.status || appt.status}: ${changes}`)
    return appt
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
      .select(`*, user:users(${USER_BRIEF})`)
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
      .select(`*, user:users(${USER_BRIEF})`)
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
      .select(`*, appointment:appointments(id, "studentId", "facultyId", "meetingType", "sessionGroupId", status)`)
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
  async listConflictingSlots(facultyIds, date, startTime, endTime) {
    const { data, error } = await supabase
      .from("appointment_time_slots")
      .select(`*, appointment:appointments!inner(id, "facultyId", "meetingType", status)`)
      .eq("date", date)
      .lt("startTime", endTime)
      .gt("endTime", startTime)
      .in("appointment.facultyId", facultyIds)

    if (error) throw error
    return data as unknown as AppointmentTimeSlotData[]
  },
  async addFile(appointmentId, data) {
    const { data: result, error } = await supabase
      .from("appointment_files")
      .insert({ appointmentId, ...data })
      .select("id, appointmentId, fileName, fileType, fileSize, createdAt")
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
  async listByUserId(userId, limit = 100) {
    const { data, error } = await supabase
      .from("appointments")
      .select(appointmentSelect)
      .or(`studentId.eq.${userId},facultyId.eq.${userId}`)
      .order("date", { ascending: true })
      .order("startTime", { ascending: true })
      .limit(limit)
    if (error) throw error
    return (data || []) as unknown as AppointmentData[]
  },
  async listAttendeesByUserId(userId, limit = 100) {
    const { data, error } = await supabase
      .from("appointment_attendees")
      .select("id, userId, appointmentId")
      .eq("userId", userId)
      .limit(limit)
    if (error) throw error
    return (data || []) as AppointmentAttendeeData[]
  },
}
