import { appointmentRepository, userRepository } from "@/lib/repositories/factory"
import { MIN_TIMESLOT_DURATION_MINUTES, MAX_TIMESLOT_DURATION_MINUTES } from "@/lib/constants"
import { generateICal } from "@/lib/services/ical"
import { sendConsultationInvite, sendMeetingInviteWithICS } from "@/lib/services/email"

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

function isValidTime(time: string): boolean {
  if (!time) return false
  const [, mins] = time.split(":").map(Number)
  return [0, 15, 30, 45].includes(mins)
}

export async function requestAppointment(input: {
  createdByUserId: string
  studentId: string | null
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

  // 1. Determine the timeslots
  const timeSlots = input.timeSlots || (input.date && input.startTime && input.endTime
    ? [{ date: input.date, startTime: input.startTime, endTime: input.endTime }]
    : [])

  if (!timeSlots || timeSlots.length === 0) {
    throw new Error("At least one timeslot (date, startTime, endTime) is required")
  }

  // 2. Initial Validations
  validateDurationAndBoundaries(timeSlots)
  checkForOverlapWithinSameAppointment(timeSlots)

  // 3. Resolve Creator
  const creator = await userRepository.findById(input.createdByUserId)
  if (!creator) throw new Error("Creator not found")

  // 4. Determine meetingType & Enforce Conflicts
  let meetingType = input.meetingType

  if (creator.role === "STUDENT") {
    meetingType = "CONSULTATION"

    // Check Student Conflicts (Only if creator is a student)
    for (const slot of timeSlots) {
      const conflictingSlots = await appointmentRepository.listStudentConflictingSlots(
        input.createdByUserId,
        slot.date,
        slot.startTime,
        slot.endTime,
        input.sessionGroupId
      )
      if (conflictingSlots.length > 0) {
        throw new Error("You already have an appointment that overlaps with this time")
      }
    }
  } else if (!meetingType) {
    meetingType = "INTERNAL"
  }

  // 5. Always Check Faculty Conflicts (Cannot double-book the target faculty)
  // for (const slot of timeSlots) {
  //   const conflictingFaculty = await appointmentRepository.listConflictingSlots(
  //     input.facultyId,
  //     slot.date,
  //     slot.startTime,
  //     slot.endTime
  //   )
  //   const actualConflicts = conflictingFaculty.filter(
  //     (apt: any) => apt.sessionGroupId !== input.sessionGroupId
  //   )
  //   if (actualConflicts.length > 0) {
  //     throw new Error("The faculty member is already booked at this time")
  //   }
  // }

  // 6. Collect all involved user IDs
  const attendeeIds = [...new Set([
    input.studentId,
    input.facultyId,
    ...(input.attendeeIds || []),
    ...(input.attendeeOptions?.map(a => a.userId) || []),
  ])].filter(Boolean) as string[]

  console.log("DEBUG: Meeting Type:", meetingType);
  console.log("DEBUG: Direct Student ID:", input.studentId);
  console.log("DEBUG: Attendee IDs:", attendeeIds);

  // 7. Enforce participant rules & Check Conflicts for Faculty/Deans
  for (const uid of attendeeIds) {
    const user = uid === input.studentId ? creator : await userRepository.findById(uid)

    // A. Role Validation for Internal Meetings
    if (meetingType === "INTERNAL") {
      if (!user || (user.role !== "FACULTY" && user.role !== "DEAN")) {
        throw new Error("Internal meetings can only include faculty and deans")
      }
    }

    // B. Conflict Check for Faculty/Deans (using the repository array method)
    if (user?.role === "FACULTY" || user?.role === "DEAN") {
      for (const slot of timeSlots) {
        const conflictingSlots = await appointmentRepository.listConflictingSlots(
          [uid],
          slot.date,
          slot.startTime,
          slot.endTime
        )

        // Filter out the current session group and rejected/cancelled appointments
        const actualConflicts = (conflictingSlots || []).filter((s: any) => {
          const apt = s.appointment
          return apt &&
            apt.sessionGroupId !== input.sessionGroupId &&
            apt.status !== "REJECTED" &&
            apt.status !== "CANCELLED"
        })

        if (actualConflicts.length > 0) {
          throw new Error(`The participant ${user.name} is already booked at this time`)
        }
      }
    }
  }

  // C. Consultation-specific Student check
  if (meetingType === "CONSULTATION") {
    // 1. Verify that the person requesting the meeting is a Student
    if (creator.role !== "STUDENT") {
      // Optional: If you want to allow Faculty to book FOR students, 
      // remove this check and keep the loop below.
      throw new Error("Consultations can only be created by students");
    }

    // 2. Verify that the student ID is either missing (use creator) or matches creator
    // This prevents a Student from accidentally booking under someone else's ID
    if (input.studentId && input.studentId !== creator.id) {
      throw new Error("Consultation studentId must match the creator");
    }
  }

  // 8. Create Appointment
  const firstSlot = timeSlots[0]
  const createdByEmail = creator.email ?? input.studentId ?? "unknown@system.com"

  // ✅ FIX: Determine the studentId before calling create
  // If it's a Consultation, we force the studentId to be the creator
  let requiredStudentId = input.studentId;
  if (meetingType === "CONSULTATION" && !requiredStudentId) {
      requiredStudentId = input.createdByUserId; 
  }

  const appointment = await appointmentRepository.create({
    studentId: requiredStudentId, //this should be creator
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

  for (const slot of timeSlots) {
    await appointmentRepository.addTimeSlot(appointment.id, slot.date, slot.startTime, slot.endTime)
  }

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

  try {

    // 9. Fetch full data & trigger emails
    const fullAppointment = await appointmentRepository.findById(appointment.id)
    if (fullAppointment) {
      sendAppointmentCreatedEmail(fullAppointment, input.createdByUserId).catch((err) => {
        console.error("Failed to send appointment creation email:", err)
      })
    }

    return fullAppointment
  } catch (err) { throw err }



  // --- Helper Functions ---
  function validateDurationAndBoundaries(slots: TimeSlot[]) {
    for (const slot of slots) {
      if (!isValidTime(slot.startTime) || !isValidTime(slot.endTime)) {
        throw new Error(`Time must be on a 15-minute boundary`)
      }
      const duration = getMinutesDifference(slot.startTime, slot.endTime)
      if (duration < MIN_TIMESLOT_DURATION_MINUTES || duration > MAX_TIMESLOT_DURATION_MINUTES) {
        throw new Error(`Invalid duration`)
      }
    }
  }

  function checkForOverlapWithinSameAppointment(slots: TimeSlot[]) {
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        if (slots[i].date === slots[j].date &&
          slots[i].startTime < slots[j].endTime &&
          slots[i].endTime > slots[j].startTime) {
          throw new Error("Timeslots cannot overlap within the same appointment")
        }
      }
    }
  }
}

// ─── Email helpers ────────────────────────────

async function sendAppointmentCreatedEmail(appointment: any, creatorId: string) {
  if (!appointment) return

  const recipients = new Map<string, { name: string; email: string }>()

  if (appointment.faculty?.id && appointment.faculty.id !== creatorId && appointment.faculty.email) {
    recipients.set(appointment.faculty.id, {
      name: appointment.faculty.name || "Faculty",
      email: appointment.faculty.email,
    })
  }

  if (Array.isArray(appointment.attendees)) {
    for (const attendee of appointment.attendees) {
      const user = attendee?.user
      if (!user || !user.id || !user.email || user.id === creatorId) continue
      recipients.set(user.id, {
        name: user.name || "Attendee",
        email: user.email,
      })
    }
  }

  if (recipients.size === 0) return

  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
  const viewUrl = `${host}/appointments/${appointment.id}`

  const organizerName = appointment.student?.id === creatorId
    ? appointment.student?.name
    : appointment.faculty?.id === creatorId
      ? appointment.faculty?.name
      : appointment.student?.name || appointment.faculty?.name || "Organizer"

  const organizerEmail = appointment.student?.id === creatorId
    ? appointment.student?.email
    : appointment.faculty?.id === creatorId
      ? appointment.faculty?.email
      : appointment.student?.email || appointment.faculty?.email || ""

  const eventSummary = appointment.title
    ? `${appointment.meetingType === "CONSULTATION" ? "Consultation" : "Meeting"}: ${appointment.title}`
    : appointment.meetingType === "CONSULTATION"
      ? "Consultation"
      : "Meeting"

  const descriptionLines = [
    appointment.title ? `Title: ${appointment.title}` : null,
    appointment.description || null,
    `Organizer: ${organizerName}`,
  ].filter(Boolean).join("\n")

  const icalString = generateICal({
    uid: `appt-${appointment.id}@e-consultation`,
    summary: eventSummary,
    description: descriptionLines,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    location: "Microsoft Teams",
    organizer: { name: organizerName, email: organizerEmail },
    attendees: Array.from(recipients.values()).map(r => ({ name: r.name, email: r.email })),
  })

  const recipientNames = Array.from(recipients.values()).map(r => r.name)
  const cc = Array.from(recipients.values()).map(r => r.email)

  for (const recipient of recipients.values()) {
    if (appointment.meetingType === "CONSULTATION") {
      await sendConsultationInvite(
        { email: recipient.email, name: recipient.name },
        {
          studentName: appointment.student?.name || "Student",
          studentEmail: appointment.student?.email || "",
          facultyName: appointment.faculty?.name || "Faculty",
          facultyEmail: appointment.faculty?.email || "",
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          title: appointment.title,
          description: appointment.description,
          viewUrl,
          cc,
        },
        icalString,
      )
    } else {
      await sendMeetingInviteWithICS(
        { email: recipient.email, name: recipient.name },
        {
          organizerName,
          title: appointment.title || "Appointment",
          description: appointment.description,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          participantNames: recipientNames,
          viewUrl,
          cc,
        },
        icalString,
      )
    }
  }
}


export async function acceptAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  // Set status + mark for Teams sync (orchestrator picks up UNWRITTEN records)
  const result = await appointmentRepository.update(id, { status: "APPROVED", teamsSyncStatus: "UNWRITTEN" })

  // Fire-and-forget consultation approval email with .ics attachment
  sendConsultationApprovedEmail(result as any).catch(() => { })

  return result
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

// ─── Email helpers (fire-and-forget) ────────────────────────────

async function sendConsultationApprovedEmail(appointment: any) {
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
  const viewUrl = `${host}/appointments/${appointment.id}`

  const student = appointment.student || { name: "Student", email: "" }
  const faculty = appointment.faculty || { name: "Faculty", email: "" }

  const { generateICal } = await import("@/lib/services/ical")
  const { sendConsultationInvite } = await import("@/lib/services/email")

  const icalString = generateICal({
    uid: `appt-${appointment.id}@e-consultation`,
    summary: `Consultation with ${faculty.name}`,
    description: [
      "Academic Consultation",
      appointment.title ? `— ${appointment.title}` : "",
      `Student: ${student.name} (${student.email})`,
      `Faculty: ${faculty.name} (${faculty.email})`,
      appointment.description || "",
    ].filter(Boolean).join("\n"),
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    location: "Microsoft Teams",
    organizer: { name: faculty.name, email: faculty.email },
    attendees: [
      { name: student.name, email: student.email },
      ...(appointment.attendees?.map((a: any) => ({
        name: a.user?.name || "Attendee",
        email: a.user?.email || "",
      })) || []),
    ],
  })

  // Send to student
  await sendConsultationInvite(
    { email: student.email, name: student.name },
    {
      studentName: student.name,
      studentEmail: student.email,
      facultyName: faculty.name,
      facultyEmail: faculty.email,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      title: appointment.title,
      description: appointment.description,
      viewUrl,
    },
    icalString,
  )

  // Send to each additional attendee
  if (appointment.attendees) {
    for (const att of appointment.attendees) {
      const user = att.user
      if (!user || user.email === student.email) continue
      await sendConsultationInvite(
        { email: user.email, name: user.name },
        {
          studentName: student.name,
          studentEmail: student.email,
          facultyName: faculty.name,
          facultyEmail: faculty.email,
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          title: appointment.title,
          description: appointment.description,
          viewUrl,
        },
        icalString,
      )
    }
  }
}
