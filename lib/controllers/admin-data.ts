import { supabase } from "@/lib/supabase"

type DbRecord = Record<string, unknown>

export interface ConsultationExportDto {
  exportedAt: string
  appointments: DbRecord[]
  files: DbRecord[]
  attendees: DbRecord[]
  timeSlots: DbRecord[]
}

export interface StudentExportDto {
  exportedAt: string
  students: DbRecord[]
  orphanedAppointmentIds: string[]
}

export async function exportAndClearConsultations(): Promise<ConsultationExportDto> {
  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("meetingType", "CONSULTATION")
    .order("date", { ascending: false })

  const appointmentIds = (appointments || []).map((a: DbRecord) => a.id as string)

  let files: DbRecord[] = []
  let attendees: DbRecord[] = []
  let timeSlots: DbRecord[] = []

  if (appointmentIds.length > 0) {
    const { data: f } = await supabase
      .from("appointment_files")
      .select("id, appointmentId, fileName, fileType, fileSize, createdAt")
      .in("appointmentId", appointmentIds)
    files = f || []

    const { data: att } = await supabase
      .from("appointment_attendees")
      .select("*")
      .in("appointmentId", appointmentIds)
    attendees = att || []

    const { data: ts } = await supabase
      .from("appointment_time_slots")
      .select("*")
      .in("appointmentId", appointmentIds)
    timeSlots = ts || []
  }

  const exportData: ConsultationExportDto = {
    exportedAt: new Date().toISOString(),
    appointments: appointments || [],
    files,
    attendees,
    timeSlots,
  }

  if (appointmentIds.length > 0) {
    const { error: err1 } = await supabase
      .from("appointment_files")
      .delete()
      .in("appointmentId", appointmentIds)
    if (err1) throw err1

    const { error: err2 } = await supabase
      .from("appointment_attendees")
      .delete()
      .in("appointmentId", appointmentIds)
    if (err2) throw err2

    const { error: err3 } = await supabase
      .from("appointment_time_slots")
      .delete()
      .in("appointmentId", appointmentIds)
    if (err3) throw err3

    const { error: err4 } = await supabase
      .from("appointments")
      .delete()
      .in("id", appointmentIds)
    if (err4) throw err4
  }

  return exportData
}

export async function exportAndDeleteStudents(): Promise<StudentExportDto> {
  // 1. Query all students (via userrole join)
  const { data: studentRoles } = await supabase
    .from("userrole")
    .select("userId")
    .eq("roleName", "STUDENT")

  const studentIds = (studentRoles || []).map((r: DbRecord) => r.userId as string)

  if (studentIds.length === 0) {
    return { exportedAt: new Date().toISOString(), students: [], orphanedAppointmentIds: [] }
  }

  // 2. Get student user records
  const { data: students } = await supabase
    .from("users")
    .select("id, name, email, course, createdAt, isDisabled, hasLoggedInBefore")
    .in("id", studentIds)

  // 3. Find their appointments
  const { data: studentAppointments } = await supabase
    .from("appointments")
    .select("id")
    .in("studentId", studentIds)

  const orphanedAppointmentIds = (studentAppointments || []).map((a: DbRecord) => a.id as string)

  // 4. Nullify studentId on their appointments
  if (orphanedAppointmentIds.length > 0) {
    const { error: err1 } = await supabase
      .from("appointments")
      .update({ studentId: null })
      .in("id", orphanedAppointmentIds)
    if (err1) throw err1

    // 5. Delete attendee records for these orphaned appointments
    const { error: err2 } = await supabase
      .from("appointment_attendees")
      .delete()
      .in("appointmentId", orphanedAppointmentIds)
    if (err2) throw err2
  }

  // 6. Delete student userrole entries
  const { error: err3 } = await supabase
    .from("userrole")
    .delete()
    .in("userId", studentIds)
  if (err3) throw err3

  // 7. Delete student users (cascades to any remaining appointment_attendees entries)
  const { error: err4 } = await supabase
    .from("users")
    .delete()
    .in("id", studentIds)
  if (err4) throw err4

  return {
    exportedAt: new Date().toISOString(),
    students: students || [],
    orphanedAppointmentIds,
  }
}
