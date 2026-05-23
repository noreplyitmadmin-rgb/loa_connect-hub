import { appointmentRepository, userRepository } from "@/lib/repositories/factory"
import { MIN_TIMESLOT_DURATION_MINUTES, MAX_TIMESLOT_DURATION_MINUTES } from "@/lib/constants"

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

function getMinutesDifference(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(":").map(Number)
  const [eh, em] = endTime.split(":").map(Number)
  return eh * 60 + em - (sh * 60 + sm)
}

function isValid30MinuteTime(time: string): boolean {
  if (!time) return false
  const [, mins] = time.split(":").map(Number)
  return mins === 0 || mins === 30
}

export async function requestAppointment(input: {
  studentId: string
  facultyId: string
  sessionGroupId?: string
  date?: string
  startTime?: string
  endTime?: string
  timeSlots?: TimeSlot[]
  title?: string
  description?: string
  attendeeIds?: string[]
  attendeeOptions?: { userId: string; isMandatory: boolean }[]
  meetingType?: "CONSULTATION" | "INTERNAL"
}) {
  // Determine the timeslots to use
  const timeSlots = input.timeSlots || (input.date && input.startTime && input.endTime 
    ? [{ date: input.date, startTime: input.startTime, endTime: input.endTime }]
    : [])
  
  if (!timeSlots || timeSlots.length === 0) {
    throw new Error("At least one timeslot (date, startTime, endTime) is required")
  }

  // Validate timeslot durations and time boundaries
  for (const slot of timeSlots) {
    if (!isValid30MinuteTime(slot.startTime)) {
      throw new Error(`Start time ${slot.startTime} must be on a 30-minute boundary (HH:00 or HH:30)`)
    }
    if (!isValid30MinuteTime(slot.endTime)) {
      throw new Error(`End time ${slot.endTime} must be on a 30-minute boundary (HH:00 or HH:30)`)
    }
    const durationMinutes = getMinutesDifference(slot.startTime, slot.endTime)
    if (durationMinutes < MIN_TIMESLOT_DURATION_MINUTES) {
      throw new Error(`Timeslot duration must be at least ${MIN_TIMESLOT_DURATION_MINUTES} minutes`)
    }
    if (durationMinutes > MAX_TIMESLOT_DURATION_MINUTES) {
      throw new Error(`Timeslot duration cannot exceed ${MAX_TIMESLOT_DURATION_MINUTES} minutes (8 hours)`)
    }
  }

  // Check for overlapping timeslots within the same appointment
  for (let i = 0; i < timeSlots.length; i++) {
    for (let j = i + 1; j < timeSlots.length; j++) {
      const slot1 = timeSlots[i]
      const slot2 = timeSlots[j]
      if (
        slot1.date === slot2.date &&
        slot1.startTime < slot2.endTime &&
        slot1.endTime > slot2.startTime
      ) {
        throw new Error("Timeslots cannot overlap within the same appointment")
      }
    }
  }

  // Check for conflicting appointments with any of the timeslots
  // Exclude appointments in the same sessionGroupId (multi-faculty / staggered blocks)
  for (const slot of timeSlots) {
    const conflictingSlots = await appointmentRepository.listStudentConflictingSlots(
      input.studentId,
      slot.date,
      slot.startTime,
      slot.endTime,
      input.sessionGroupId
    )
    if (conflictingSlots.length > 0) {
      throw new Error("You already have an appointment that overlaps with this time")
    }
  }

  // Resolve creator to determine meetingType
  const creator = await userRepository.findById(input.studentId)
  if (!creator) throw new Error("Creator not found")

  // Determine meetingType based on role
  let meetingType = input.meetingType
  if (creator.role === "STUDENT") {
    // Students always create consultations
    meetingType = "CONSULTATION"
  } else if (!meetingType) {
    // Faculty/Dean default to INTERNAL
    meetingType = "INTERNAL"
  }

  // Collect all involved user IDs
  const attendeeIds = [...new Set([
    input.studentId,
    input.facultyId,
    ...(input.attendeeIds || []),
    ...(input.attendeeOptions?.map(a => a.userId) || []),
  ])]

  // Enforce participant rules per meetingType
  if (meetingType === "INTERNAL") {
    for (const uid of attendeeIds) {
      const user = uid === input.studentId ? creator : await userRepository.findById(uid)
      if (!user || (user.role !== "FACULTY" && user.role !== "DEAN")) {
        throw new Error("Internal meetings can only include faculty and deans")
      }
    }
  } else {
    // CONSULTATION — at least one student must be involved
    let hasStudent = creator.role === "STUDENT"
    if (!hasStudent) {
      for (const uid of attendeeIds) {
        if (uid === input.studentId) continue // already checked
        const user = await userRepository.findById(uid)
        if (user?.role === "STUDENT") { hasStudent = true; break }
      }
    }
    if (!hasStudent) {
      throw new Error("Consultations must include at least one student")
    }
  }

  // Use first timeslot for main appointment record (backward compat for Teams sync)
  const firstSlot = timeSlots[0]

  const createdByEmail = creator.email ?? input.studentId

  const appointment = await appointmentRepository.create({
    studentId: input.studentId,
    facultyId: input.facultyId,
    createdByEmail,
    meetingType,
    sessionGroupId: input.sessionGroupId ?? null,
    date: firstSlot.date,
    startTime: firstSlot.startTime,
    endTime: firstSlot.endTime,
    title: input.title ?? null,
    description: input.description ?? null,
  })

  // Add all timeslots
  for (const slot of timeSlots) {
    await appointmentRepository.addTimeSlot(appointment.id, slot.date, slot.startTime, slot.endTime)
  }

  // Add additional attendees
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

export async function acceptAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  // Set status + mark for Teams sync (orchestrator picks up UNWRITTEN records)
  return appointmentRepository.update(id, { status: "APPROVED", teamsSyncStatus: "UNWRITTEN" })
}

// Backward-compat alias
export const approveAppointment = acceptAppointment

export async function declineAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  return appointmentRepository.update(id, { status: "REJECTED" })
}

// Backward-compat alias
export const rejectAppointment = declineAppointment

export async function completeAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "APPROVED") throw new Error("Appointment is not approved")

  return appointmentRepository.update(id, { status: "COMPLETED" })
}

export async function cancelAppointment(id: string, userId: string, userEmail?: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")

  // Only the creator or the consulting faculty can cancel
  const isCreator = userEmail && appointment.createdByEmail === userEmail
  const isFaculty = appointment.facultyId === userId
  if (!isCreator && !isFaculty) throw new Error("Unauthorized — only the creator or faculty can cancel")

  // Faculty can only cancel approved appointments
  if (isFaculty && !isCreator && appointment.status !== "APPROVED") {
    throw new Error("Only approved appointments can be cancelled by faculty")
  }

  // If synced to Teams, attempt cleanup (best-effort, does not block cancellation)
  if (appointment.teamsSyncStatus === "WRITTEN") {
    // TODO: Phase 7 — attempt Teams meeting deletion
    // If deletion fails, log error but proceed with cancellation
  }

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
