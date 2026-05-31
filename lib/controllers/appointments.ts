import { appointmentRepository, userRepository } from "@/lib/repositories/factory"
import { MIN_TIMESLOT_DURATION_MINUTES, MAX_TIMESLOT_DURATION_MINUTES } from "@/lib/constants"
import { generateICal } from "@/lib/services/ical"
import { sendAppointmentCreatedWorkflow, sendConsultationApprovedWorkflow, sendConsultationInviteWorkflow, sendMeetingInviteWithAcknowledgementWorkflow, sendConsultationInviteWithAcknowledgementWorkflow, sendStatusUpdateWorkflow } from "@/lib/workflows/email-workflows"
import { hasRole } from "@/lib/utils/roles"
import type { AppointmentData } from "@/lib/repositories/interfaces"

type DbRecord = Record<string, unknown>

export interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface CreateData {
  studentId: string | null
  facultyId: string
  createdByEmail: string
  meetingType?: "CONSULTATION"
  sessionGroupId: string | null
  date: string
  startTime: string
  endTime: string
  title: string | null
  description: string | null
  teamsLink?: string
  status?: string
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
  teamsLink?: string
  slotLinks?: Record<string, string>
  meetingType?: "CONSULTATION"
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

  if (hasRole(creator.role, "STUDENT")) {
    meetingType = "CONSULTATION"
  } else if (!meetingType) {
    meetingType = "CONSULTATION"
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

  // 7. Conflict checking — rules vary by creator role
  const conflicts: { userId: string; userName: string; message: string; appointments: { appointmentId: string; title: string; date: string; startTime: string; endTime: string }[] }[] = []

  const mapConflicts = (slots: DbRecord[]) =>
    slots.map((s: DbRecord) => ({
      appointmentId: ((s.appointment as DbRecord)?.id as string) || (s.appointmentId as string) || "",
      title: ((s.appointment as DbRecord)?.title as string) || null,
      meetingType: ((s.appointment as DbRecord)?.meetingType as string) || "MEETING",
      date: s.date as string,
      startTime: s.startTime as string,
      endTime: s.endTime as string,
    }))

  // Students cannot invite other students as attendees
  if (hasRole(creator.role, "STUDENT")) {
    for (const uid of attendeeIds) {
      if (uid === input.createdByUserId) continue
      const user = await userRepository.findById(uid)
      if (user && hasRole(user.role, "STUDENT")) {
        throw new Error("Students cannot invite other students to appointments")
      }
    }
  }

  if (hasRole(creator.role, "STUDENT")) {
    // Student checks own consultation conflicts (PENDING or APPROVED) → block
    for (const slot of timeSlots) {
      const conflictingSlots = await appointmentRepository.listStudentConflictingSlots(
        input.createdByUserId,
        slot.date,
        slot.startTime,
        slot.endTime,
        input.sessionGroupId
      )
      if (conflictingSlots.length > 0) {
        const err = Object.assign(
          new Error("You already have an appointment that overlaps with this time"),
          { conflicts: [{
            userId: input.createdByUserId,
            userName: "You",
            message: "You already have an appointment that overlaps with this time",
            appointments: mapConflicts(conflictingSlots as unknown as DbRecord[]),
          }] }
        )
        throw err
      }
    }

    // Student checks primary faculty's conflict (APPROVED only) → block
    for (const slot of timeSlots) {
      const conflictingSlots = await appointmentRepository.listConflictingSlots(
        [input.facultyId],
        slot.date,
        slot.startTime,
        slot.endTime
      )
      const dbSlots = (conflictingSlots || []) as unknown as DbRecord[]
      const actualConflicts = dbSlots.filter((s: DbRecord) => {
        const apt = s.appointment as DbRecord | undefined
        return apt &&
          apt.sessionGroupId !== input.sessionGroupId &&
          apt.status === "APPROVED"
      })
      if (actualConflicts.length > 0) {
        const faculty = await userRepository.findById(input.facultyId)
        const err = Object.assign(
          new Error(`${faculty?.name || "Faculty"} is already booked at this time`),
          { conflicts: [{
            userId: input.facultyId,
            userName: faculty?.name || "Faculty",
            message: `${faculty?.name || "Faculty"} is already booked at this time`,
            appointments: mapConflicts(actualConflicts),
          }] }
        )
        throw err
      }
    }
  } else if (hasRole(creator.role, "FACULTY") || hasRole(creator.role, "DEAN")) {
    // Faculty/Dean checks own meeting conflicts (PENDING or APPROVED) → block
    for (const slot of timeSlots) {
      const conflictingSlots = await appointmentRepository.listConflictingSlots(
        [input.createdByUserId],
        slot.date,
        slot.startTime,
        slot.endTime
      )
      const dbSlots = (conflictingSlots || []) as unknown as DbRecord[]
      const actualConflicts = dbSlots.filter((s: DbRecord) => {
        const apt = s.appointment as DbRecord | undefined
        return apt &&
          apt.sessionGroupId !== input.sessionGroupId &&
          apt.status === "APPROVED"
      })
      if (actualConflicts.length > 0) {
        const faculty = await userRepository.findById(input.facultyId)
        const err = Object.assign(
          new Error(`${faculty?.name || "Faculty"} is already booked at this time`),
          { conflicts: [{
            userId: input.facultyId,
            userName: faculty?.name || "Faculty",
            message: `${faculty?.name || "Faculty"} is already booked at this time`,
            appointments: mapConflicts(actualConflicts),
          }] }
        )
        throw err
      }
    }
  }

  // C. Consultation-specific Student check
  if (meetingType === "CONSULTATION") {
    // 1. Verify that the person requesting the meeting is a Student
    if (!hasRole(creator.role, "STUDENT")) {
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

  // 8. Faculty/Dean meetings require at least one attendee
  if (!hasRole(creator.role, "STUDENT") && (!input.attendeeOptions || input.attendeeOptions.length === 0)) {
    throw new Error("Meetings must have at least one attendee")
  }

  // 9. Create Appointment
  const firstSlot = timeSlots[0]
  const createdByEmail = creator.email ?? input.studentId ?? "unknown@system.com"

  // ✅ FIX: Determine the studentId before calling create
  // If it's a Consultation, we force the studentId to be the creator
  let requiredStudentId = input.studentId;
  if (meetingType === "CONSULTATION" && !requiredStudentId) {
      requiredStudentId = input.createdByUserId; 
  }

  const createData: CreateData = {
    studentId: requiredStudentId,
    facultyId: input.facultyId,
    createdByEmail,
    meetingType,
    sessionGroupId: input.sessionGroupId ?? null,
    date: firstSlot.date,
    startTime: firstSlot.startTime,
    endTime: firstSlot.endTime,
    title: input.title ?? null,
    description: input.description ?? null,
  }
  if (input.teamsLink) createData.teamsLink = input.teamsLink
  if (!hasRole(creator.role, "STUDENT")) {
    createData.status = "APPROVED"
  }

  const appointment = await appointmentRepository.create(createData)

  // Add time slots and attach any per-slot teams links provided by creator
  for (const slot of timeSlots) {
    const createdSlot = await appointmentRepository.addTimeSlot(appointment.id, slot.date, slot.startTime, slot.endTime)
    if (input.slotLinks) {
      const key = `${slot.date}-${slot.startTime}-${slot.endTime}`
      const link = input.slotLinks[key]
      if (link && typeof link === "string") {
        try {
          await appointmentRepository.updateTimeSlot(createdSlot.id, { teamsLink: link.trim() })
        } catch (err) {
          console.error("Failed to save slot teams link:", err)
        }
      }
    }
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
      sendAppointmentCreatedWorkflow(fullAppointment as unknown as Record<string, unknown>, input.createdByUserId).catch((err) => {
        console.error("Failed to send appointment creation email:", err)
      })
    }

    return { appointment: fullAppointment, conflicts }
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

export interface ApptWithJoins extends AppointmentData {
  student?: { id: string; name: string; email: string; role: string }
  faculty?: { id: string; name: string; email: string; role: string }
  attendees?: Array<{
    id: string
    userId: string
    status: string
    isMandatory: boolean
    user?: { id: string; name: string; email: string; role: string }
  }>
  timeSlots?: Array<{ id: string; date: string; startTime: string; endTime: string; teamsLink?: string }>
}

export async function sendAppointmentCreatedEmail(appointment: ApptWithJoins, creatorId: string) {
  if (!appointment) return

  // ── Determine primary recipient (the TO) ──
  // The primary recipient is appointment.faculty (or first attendee as fallback).
  // If the primary user is the creator (self-booking), fall through to attendees.
  let primaryUser = appointment.faculty?.id ? appointment.faculty : appointment.attendees?.[0]?.user
  if (!primaryUser?.id || !primaryUser?.email) return
  if (primaryUser.id === creatorId && appointment.attendees && appointment.attendees.length > 0) {
    const other = appointment.attendees.find(a => a.user?.id && a.user.id !== creatorId && a.user.email)
    if (other?.user) {
      primaryUser = other.user
    }
  }
  if (primaryUser.id === creatorId) return

  // ── Build CC list from attendees (excluding primary TO) ──
  const ccList: { name: string; email: string }[] = []
  if (appointment.attendees) {
    for (const attendee of appointment.attendees) {
      const user = attendee?.user
      if (!user || !user.id || !user.email) continue
      if (user.id === primaryUser.id) continue
      ccList.push({ name: user.name || "Attendee", email: user.email })
    }
  }

  // ── Resolve creator user for notifications ──
  const creatorUser = appointment.faculty?.id === creatorId
    ? appointment.faculty
    : appointment.attendees?.find(a => a.user?.id === creatorId)?.user ?? null

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

  const allParticipants = [
    { name: primaryUser.name || "Faculty", email: primaryUser.email },
    ...ccList,
  ]

  const icalString = generateICal({
    uid: `appt-${appointment.id}@e-consultation`,
    summary: eventSummary,
    description: descriptionLines,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    location: "Microsoft Teams",
    organizer: { name: organizerName, email: organizerEmail },
    attendees: allParticipants,
  })

  const participantNames = allParticipants.map(r => r.name)
  const ccEmails = ccList.map(r => r.email)

  // ── Send emails ──
  if (appointment.meetingType === "CONSULTATION") {
    // Student booking: sequenced send via workflow (invite then acknowledgement)
    const studentCreator = appointment.student?.email ? appointment.student : null

    const acknowledgementData = studentCreator && studentCreator.email !== primaryUser.email
      ? {
          meetingTitle: appointment.title || "Consultation Request",
          attendeeNames: allParticipants.map(p => p.name),
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          viewUrl,
          variant: "request" as const,
        }
      : null

    await sendConsultationInviteWithAcknowledgementWorkflow(
      { email: primaryUser.email, name: primaryUser.name },
      ccEmails,
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
      },
      icalString,
      acknowledgementData ? { email: studentCreator!.email, name: studentCreator!.name } : null,
      acknowledgementData,
    )
  } else {
    // Faculty/Dean booking: sequenced sends via workflow
    const isCreatorAttendee = creatorUser?.email && ccEmails.includes(creatorUser.email)

    const acknowledgementData = creatorUser && creatorUser.id !== primaryUser.id && !isCreatorAttendee
      ? {
          meetingTitle: appointment.title || "Meeting",
          attendeeNames: allParticipants.map(p => p.name),
          date: appointment.date,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          viewUrl,
          variant: "booking" as const,
        }
      : null

    await sendMeetingInviteWithAcknowledgementWorkflow(
      { email: primaryUser.email, name: primaryUser.name },
      ccEmails,
      {
        organizerName,
        title: appointment.title || "Appointment",
        description: appointment.description,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        participantNames,
        viewUrl,
      },
      icalString,
      acknowledgementData ? { email: creatorUser!.email, name: creatorUser!.name } : null,
      acknowledgementData,
    )
  }
}


export async function acceptAppointment(id: string, facultyId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "PENDING") throw new Error("Appointment is not pending")

  // Set status + mark for Teams sync (orchestrator picks up UNWRITTEN records)
  const result = await appointmentRepository.update(id, { status: "APPROVED", teamsSyncStatus: "UNWRITTEN" })

  const appt = result as unknown as ApptWithJoins
  const hasStudent = appt.student?.email

  if (hasStudent) {
    // Student-booking: existing flow with .ics + Teams link
    sendConsultationApprovedWorkflow(result as unknown as Record<string, unknown>).catch((err) => {
      console.error("Failed to send consultation approved email:", err)
    })
  } else {
    // Self-booking (faculty is both creator and accepter): notify attendees
    const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
    const viewUrl = `${host}/appointments/${id}`
    const faculty = appt.faculty || { id: "", name: "Faculty", email: "" }
    const attendeeNames = (appt.attendees || []).map(a => a.user?.name || "Attendee").filter(Boolean)
    const attendeeRecipients = (appt.attendees || [])
      .map(a => a.user)
      .filter((u): u is { id: string; name: string; email: string; role: string } => !!u?.email)

    sendStatusUpdateWorkflow(
      { email: faculty.email, name: faculty.name },
      attendeeRecipients,
      {
        variant: "accepted",
        actorName: faculty.name,
        meetingTitle: appt.title || "Meeting",
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        description: appt.description,
        viewUrl,
        attendeeNames,
        isCreator: true,
        meetingType: "INTERNAL",
      }
    ).catch((err) => {
      console.error("Failed to send self-booking acceptance notification:", err)
    })
  }

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

export async function attendeeAcceptAppointment(id: string, userId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")

  const attendee = await appointmentRepository.updateAttendeeStatus(id, userId, "ACCEPTED")

  // Fire-and-forget confirmation to the attendee
  // (email logic can be added later)

  return { appointment, attendee }
}

export async function attendeeDeclineAppointment(id: string, userId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")

  const attendee = await appointmentRepository.updateAttendeeStatus(id, userId, "DECLINED")

  return { appointment, attendee }
}

export async function completeAppointment(id: string, facultyId: string, actionTaken?: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.facultyId !== facultyId) throw new Error("Unauthorized")
  if (appointment.status !== "APPROVED") throw new Error("Appointment is not approved")

  if (!actionTaken || actionTaken.trim().length < 100) {
    throw new Error("Actions taken must be at least 100 characters")
  }

  const result = await appointmentRepository.update(id, { status: "COMPLETED", actionTaken })

  // Fire-and-forget completion notification
  const appt = appointment as unknown as ApptWithJoins
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
  const viewUrl = `${host}/appointments/${id}`

  const faculty = appt.faculty || { id: "", name: "Faculty", email: "" }
  const student = appt.student
  const attendees = (appt.attendees || []).map(a => a.user).filter((u): u is { id: string; name: string; email: string; role: string } => !!u?.email)

  // TO = creator (student if exists, otherwise faculty for self-booking)
  const to = student?.email ? { email: student.email, name: student.name } : { email: faculty.email, name: faculty.name }
  const cc = attendees.filter(a => a.email !== to.email)
  const allNames = [
    ...(student ? [student.name] : [faculty.name]),
    ...attendees.map(a => a.name),
  ]

  sendStatusUpdateWorkflow(
    to,
    cc,
    {
      variant: "completed",
      actorName: faculty.name,
      meetingTitle: appt.title || "Meeting",
      date: appt.date,
      startTime: appt.startTime,
      endTime: appt.endTime,
      description: appt.description,
      viewUrl,
      extraInfo: actionTaken,
      attendeeNames: allNames,
      isCreator: !student?.email,
      meetingType: student?.email ? "CONSULTATION" : "INTERNAL",
    }
  ).catch((err) => {
    console.error("Failed to send completion notification:", err)
  })

  return result
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

  const result = await appointmentRepository.update(id, { status: "CANCELLED" })

  // Fire-and-forget cancellation notification
  const [actor] = await Promise.all([
    userRepository.findById(userId),
  ])
  const actorName = actor?.name || (isFaculty ? "Faculty" : "Creator")

  const appt = result as unknown as ApptWithJoins
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
  const viewUrl = `${host}/appointments/${id}`

  const faculty = appt.faculty || { id: "", name: "Faculty", email: "" }
  const student = appt.student
  const attendees = (appt.attendees || []).map(a => a.user).filter((u): u is { id: string; name: string; email: string; role: string } => !!u?.email)

  // Determine TO: non-actor priority order = student (creator) → faculty → first attendee
  let to: { email: string; name: string } | null = null
  if (student?.email && !isCreator) {
    to = { email: student.email, name: student.name }
  } else if (faculty.email && !isFaculty) {
    to = { email: faculty.email, name: faculty.name }
  } else {
    const first = attendees.find(a => a.id !== userId)
    if (first) to = { email: first.email, name: first.name }
  }

  if (to) {
    const cc = [
      ...(student?.email && to.email !== student.email ? [{ email: student.email, name: student.name }] : []),
      ...(faculty.email && to.email !== faculty.email ? [{ email: faculty.email, name: faculty.name }] : []),
      ...attendees.filter(a => a.email !== to!.email),
    ]
    // Deduplicate by email
    const seen = new Set<string>()
    const uniqueCc = cc.filter(c => {
      if (seen.has(c.email)) return false
      seen.add(c.email)
      return true
    })

    const allNames = [
      ...(student ? [student.name] : []),
      ...(faculty ? [faculty.name] : []),
      ...attendees.map(a => a.name),
    ]
    const uniqueNames = [...new Set(allNames)]

    sendStatusUpdateWorkflow(
      to,
      uniqueCc,
      {
        variant: "cancelled",
        actorName,
        meetingTitle: appt.title || "Meeting",
        date: appt.date,
        startTime: appt.startTime,
        endTime: appt.endTime,
        description: appt.description,
        viewUrl,
        attendeeNames: uniqueNames,
        isCreator: false,
        meetingType: student?.email ? "CONSULTATION" : "INTERNAL",
      }
    ).catch((err) => {
      console.error("Failed to send cancellation notification:", err)
    })
  }

  return result
}

export async function studentResendInvitation(id: string, userId: string) {
  const appointment = await appointmentRepository.findById(id)
  if (!appointment) throw new Error("Appointment not found")
  if (appointment.studentId !== userId) throw new Error("Unauthorized — only the student can resend")
  if (appointment.status !== "REJECTED" && appointment.status !== "CANCELLED") {
    throw new Error("Can only resend invitation for rejected or cancelled appointments")
  }

  const updated = await appointmentRepository.update(id, {
    status: "PENDING",
    teamsLink: null,
    teamsSyncStatus: "UNWRITTEN",
    teamsSyncRetries: 0,
    teamsSyncError: null,
    teamsSyncLastAttempt: null,
  })

  // Fire-and-forget: re-send the invitation email to the faculty
  const [faculty, student] = await Promise.all([
    userRepository.findById(appointment.facultyId),
    userRepository.findById(appointment.studentId),
  ])

  if (faculty && student) {
    const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
    const viewUrl = `${host}/appointments/${id}`
    sendConsultationInviteWorkflow(
      { email: faculty.email, name: faculty.name },
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
      }
    ).catch((err) => {
      console.error("Failed to resend invitation email:", err)
    })
  }

  return updated
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

export async function getFacultyBookedAppointments(facultyId: string, startDate: string, endDate: string) {
  return appointmentRepository.listFacultyAppointmentsByDateRange(facultyId, startDate, endDate, "APPROVED")
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

export async function getAppointmentDetail(id: string) {
  const appointment: ApptWithJoins | null = await appointmentRepository.findById(id) as unknown as ApptWithJoins
  if (!appointment) throw new Error("Appointment not found")

  // Use embedded time slots from the query join (avoids extra fetch)
  let timeSlots: DbRecord[] = appointment.timeSlots || []
  // If the join didn't return them (e.g. older data), fetch separately
  if (timeSlots.length === 0) {
    try {
      timeSlots = await appointmentRepository.listTimeSlots(id) as unknown as DbRecord[]
    } catch {
      // appointment_time_slots table may not exist yet
    }
  }
  let files: DbRecord[] = []
  try {
    files = await appointmentRepository.listFiles(id) as unknown as DbRecord[]
  } catch {
    // appointment_files table may not exist yet (migration not run)
  }

  // ── Derive organizer from createdByEmail ───────────────────────
  let organizer: { id: string; name: string; email: string; role?: string } | null = null
  if (appointment.createdByEmail === (appointment.student as DbRecord)?.email as string) {
    const stu = appointment.student as DbRecord
    organizer = { id: stu.id as string, name: stu.name as string, email: stu.email as string, role: stu.role as string }
  } else if (appointment.createdByEmail === (appointment.faculty as DbRecord)?.email as string) {
    const fac = appointment.faculty as DbRecord
    organizer = { id: fac.id as string, name: fac.name as string, email: fac.email as string, role: fac.role as string }
  } else {
    const matched = (appointment.attendees || []).find((a: DbRecord) => (a.user as DbRecord)?.email === appointment.createdByEmail)
    if (matched?.user) {
      const u = matched.user as DbRecord
      organizer = { id: u.id as string, name: u.name as string, email: u.email as string, role: u.role as string }
    }
  }
  if (!organizer) {
    // Fallback: use the student as organizer
    const stu = appointment.student as DbRecord
    organizer = stu
      ? { id: stu.id as string, name: stu.name as string, email: stu.email as string, role: stu.role as string }
      : { id: "", name: "Unknown", email: appointment.createdByEmail }
  }

  // ── Filter attendees: exclude organizer and primary faculty ────
  const filtered = (appointment.attendees || []).filter((a: DbRecord) => {
    if (!a.user) return false
    if ((a.user as DbRecord).id === (appointment.faculty as DbRecord)?.id) return false
    if ((a.user as DbRecord).id === organizer!.id) return false
    return true
  })

  const mappedAttendees = filtered.map((a: DbRecord) => ({
    id: a.id as string,
    userId: a.userId as string,
    status: (a.status as string) === "INVITED" ? "PENDING" as const : (a.status as "ACCEPTED" | "DECLINED"),
    isMandatory: a.isMandatory as boolean,
    user: { id: (a.user as DbRecord).id as string, name: (a.user as DbRecord).name as string, email: (a.user as DbRecord).email as string, role: (a.user as DbRecord).role as string },
  }))

  const mapUser = (u: unknown) => (u ? { id: (u as DbRecord).id as string, name: (u as DbRecord).name as string, email: (u as DbRecord).email as string, role: (u as DbRecord).role as string } : null)

  return {
    id: appointment.id,
    status: appointment.status,
    meetingType: appointment.meetingType,
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    title: appointment.title,
    description: appointment.description,
    teamsLink: appointment.teamsLink,
    teamsSyncStatus: appointment.teamsSyncStatus,
    teamsSyncRetries: appointment.teamsSyncRetries,
    teamsSyncError: appointment.teamsSyncError,
    actionTaken: appointment.actionTaken || null,
    teamsSyncLastAttempt: appointment.teamsSyncLastAttempt,
    requestedAt: appointment.requestedAt,
    updatedAt: appointment.updatedAt,
    organizer,
    student: mapUser(appointment.student),
    faculty: mapUser(appointment.faculty),
    attendees: mappedAttendees,
    timeSlots: timeSlots.map((s: DbRecord) => ({
      id: s.id as string,
      date: s.date as string,
      startTime: s.startTime as string,
      endTime: s.endTime as string,
      teamsLink: (s.teamsLink as string) || null,
    })),
    files: files.map((f: DbRecord) => ({
      id: f.id,
      fileName: f.fileName,
      fileType: f.fileType,
      fileData: f.fileData,
      fileSize: f.fileSize,
      createdAt: typeof f.createdAt === "string" ? f.createdAt : (f.createdAt as Date).toISOString(),
    })),
  }
}

// ─── Email helpers (fire-and-forget) ────────────────────────────

export async function sendConsultationApprovedEmail(appointment: ApptWithJoins) {
  const host = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
  const viewUrl = `${host}/appointments/${appointment.id}`

  const student = appointment.student || { name: "Student", email: "" }
  const faculty = appointment.faculty || { name: "Faculty", email: "" }

  const { generateICal } = await import("@/lib/services/ical")
  const { sendApprovedWithTeamsLink } = await import("@/lib/services/email")

  // Collect CC list: faculty + all attendees (excluding student)
  const ccMap = new Map<string, { email: string; name: string }>()
  if (faculty.email && faculty.email !== student.email) {
    ccMap.set(faculty.email, { email: faculty.email, name: faculty.name })
  }
  if (appointment.attendees) {
    for (const att of appointment.attendees) {
      const user = att.user
      if (!user || !user.email || user.email === student.email) continue
      if (!ccMap.has(user.email)) {
        ccMap.set(user.email, { email: user.email, name: user.name })
      }
    }
  }

  const teamsLink = appointment.teamsLink || null

  const icalString = generateICal({
    uid: `appt-${appointment.id}@e-consultation`,
    summary: `Consultation with ${faculty.name}`,
    description: [
      "Academic Consultation — Accepted",
      appointment.title ? `— ${appointment.title}` : "",
      `Student: ${student.name} (${student.email})`,
      `Faculty: ${faculty.name} (${faculty.email})`,
      teamsLink ? `Teams link: ${teamsLink}` : "",
      appointment.description || "",
    ].filter(Boolean).join("\n"),
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    location: teamsLink || "Microsoft Teams",
    organizer: { name: faculty.name, email: faculty.email },
    attendees: [
      { name: student.name, email: student.email },
      ...Array.from(ccMap.values()),
    ],
  })

  await sendApprovedWithTeamsLink(
    { email: student.email, name: student.name },
    Array.from(ccMap.values()),
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
      teamsLink,
      viewUrl,
    },
    icalString,
  )
}

export async function getMeetingsForUser(userId: string) {
  const [organized, invited] = await Promise.all([
    appointmentRepository.listByFaculty(userId),
    appointmentRepository.listByParticipant(userId),
  ])

  const merged = [...organized, ...invited]
  const seen = new Set<string>()
  const unique = merged.filter((apt: AppointmentData) => {
    if (seen.has(apt.id as string)) return false
    seen.add(apt.id as string)
    return true
  })

  // Format to match legacy MeetingData shape for the frontend UI compatibility
  return (unique as unknown as DbRecord[]).map((appointment: DbRecord) => {
    const participants = ((appointment.attendees as DbRecord[]) || []).map((att: DbRecord) => ({
      id: att.id as string,
      meetingId: appointment.id as string,
      userId: att.userId as string,
      status: (att.status === "ACCEPTED" ? "ACCEPTED" : att.status === "DECLINED" ? "DECLINED" : "PENDING") as "ACCEPTED" | "DECLINED" | "PENDING",
      user: att.user as DbRecord,
    }))

    const stu = appointment.student as DbRecord | undefined
    const fac = appointment.faculty as DbRecord | undefined
    const organizer = stu?.email === appointment.createdByEmail
      ? stu
      : fac?.email === appointment.createdByEmail
        ? fac
        : stu || fac || null

    return {
      id: appointment.id as string,
      title: appointment.title as string,
      description: appointment.description as string,
      date: appointment.date as string,
      startTime: appointment.startTime as string,
      endTime: appointment.endTime as string,
      organizerId: (organizer?.id as string) || (appointment.facultyId as string) || (appointment.studentId as string),
      teamsEventId: null,
      teamsLink: appointment.teamsLink as string,
      status: appointment.status as string,
      createdAt: new Date(appointment.requestedAt as string),
      organizer,
      participants,
    }
  })
}
