import { appointmentRepository, userRepository } from "@/lib/repositories/factory"

export async function requestAppointment(input: {
  studentId: string
  facultyId: string
  sessionGroupId?: string
  date: string
  startTime: string
  endTime: string
  title?: string
  description?: string
  attendeeIds?: string[]
  attendeeOptions?: { userId: string; isMandatory: boolean }[]
}) {
  // Check for conflicting appointments
  const existingAppts = await appointmentRepository.listByStudent(input.studentId)
  const conflicting = existingAppts.find(
    (a) =>
      a.status !== "REJECTED" &&
      a.status !== "CANCELLED" &&
      a.date === input.date &&
      a.startTime < input.endTime &&
      a.endTime > input.startTime
  )
  if (conflicting) throw new Error("You already have an appointment that overlaps with this time")

  // Validate additional attendees are FACULTY or DEAN role
  const attendeeIds = input.attendeeIds || input.attendeeOptions?.map(a => a.userId) || []
  if (attendeeIds.length > 0) {
    for (const attendeeId of attendeeIds) {
      const user = await userRepository.findById(attendeeId)
      if (!user || (user.role !== "FACULTY" && user.role !== "DEAN")) {
        throw new Error(`User ${attendeeId} is not a faculty member`)
      }
    }
  }

  const appointment = await appointmentRepository.create({
    studentId: input.studentId,
    facultyId: input.facultyId,
    sessionGroupId: input.sessionGroupId ?? null,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    title: input.title ?? null,
    description: input.description ?? null,
  })

  // Add additional faculty attendees
  if (input.attendeeOptions && input.attendeeOptions.length > 0) {
    for (const opt of input.attendeeOptions) {
      if (opt.userId !== input.facultyId) {
        await appointmentRepository.addAttendee(appointment.id, opt.userId, opt.isMandatory)
      }
    }
  } else if (input.attendeeIds && input.attendeeIds.length > 0) {
    for (const attendeeId of input.attendeeIds) {
      if (attendeeId !== input.facultyId) {
        await appointmentRepository.addAttendee(appointment.id, attendeeId)
      }
    }
  }

  return appointmentRepository.findById(appointment.id)
}

export async function approveAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  // Set status + mark for Teams sync (orchestrator picks up UNWRITTEN records)
  return appointmentRepository.update(id, { status: "APPROVED", teamsSyncStatus: "UNWRITTEN" })
}

export async function rejectAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  return appointmentRepository.update(id, { status: "REJECTED" })
}

export async function completeAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "APPROVED") throw new Error("Appointment is not approved")

  return appointmentRepository.update(id, { status: "COMPLETED" })
}

export async function cancelAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "APPROVED") throw new Error("Only approved appointments can be cancelled")

  // If synced to Teams, attempt cleanup (best-effort, does not block cancellation)
  if (appointment.teamsSyncStatus === "WRITTEN") {
    // TODO: Phase 7 — attempt Teams meeting deletion
    // If deletion fails, log error but proceed with cancellation
  }

  return appointmentRepository.update(id, { status: "CANCELLED" })
}

export async function studentCancelAppointment(id: string, studentId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.studentId !== studentId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Only pending appointments can be cancelled")

  return appointmentRepository.update(id, { status: "CANCELLED" })
}

export async function updateTeamsLink(id: string, facultyId: string, teamsLink: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")

  return appointmentRepository.update(id, { teamsLink })
}

export async function retryTeamsSync(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "APPROVED") throw new Error("Only approved appointments can be synced")

  return appointmentRepository.update(id, { teamsSyncStatus: "UNWRITTEN", teamsSyncRetries: 0, teamsSyncError: null, teamsSyncLastAttempt: null })
}

export async function listStudentAppointments(studentId: string) {
  return appointmentRepository.listByStudent(studentId)
}

export async function listFacultyAppointments(facultyId: string) {
  return appointmentRepository.listByFaculty(facultyId)
}

export async function getAllAppointments() {
  return appointmentRepository.listAll()
}

export async function getAppointmentById(id: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  return appointment
}
