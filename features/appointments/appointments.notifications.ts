import type { ApptWithJoins } from "./appointments.service"
import { getAppointmentUrl, getRecipientType } from "@/lib/utils/appointment-url"
import {
  sendConsultationApprovedWorkflow,
  sendStatusUpdateWorkflow,
} from "@/lib/workflows/email-workflows"
import type { EmailRecipient } from "@/lib/workflows/email-workflows"

function buildRecipients(appointment: ApptWithJoins): EmailRecipient[] {
  const recipients: EmailRecipient[] = []

  const addRecipient = (u: { email: string; name: string }) => {
    const rtype = getRecipientType(u.email, appointment)
    recipients.push({
      email: u.email,
      name: u.name,
      viewUrl: getAppointmentUrl(appointment.id!, rtype),
    })
  }

  if (appointment.student?.email) addRecipient(appointment.student)
  if (appointment.faculty?.email && !recipients.some(r => r.email === appointment.faculty!.email)) {
    addRecipient(appointment.faculty)
  }
  for (const att of (appointment.attendees || [])) {
    const u = att.user
    if (u?.email && !recipients.some(r => r.email === u.email)) {
      addRecipient(u)
    }
  }

  return recipients
}

const participantNames = (recipients: EmailRecipient[]) =>
  [...new Set(recipients.map(r => r.name))]

export async function notifyAppointmentAccepted(appointment: ApptWithJoins) {
  const hasStudent = !!appointment.student?.email

  if (hasStudent) {
    await sendConsultationApprovedWorkflow(
      appointment as unknown as Record<string, unknown>,
    ).catch((err) => {
      console.error("Failed to send consultation approved email:", err)
    })
  } else {
    const faculty = appointment.faculty || { id: "", name: "Faculty", email: "" }
    const recipients = buildRecipients(appointment)
    const names = participantNames(recipients)

    await sendStatusUpdateWorkflow(recipients, {
      variant: "accepted",
      actorName: faculty.name,
      meetingTitle: appointment.title || "Meeting",
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      description: appointment.description,
      attendeeNames: names,
      isCreator: true,
      meetingType: "INTERNAL",
    }).catch((err) => {
      console.error("Failed to send self-booking acceptance notification:", err)
    })
  }
}

export async function notifyAppointmentCompleted(appointment: ApptWithJoins, actionTaken?: string) {
  const faculty = appointment.faculty || { id: "", name: "Faculty", email: "" }
  const recipients = buildRecipients(appointment)
  const names = participantNames(recipients)

  await sendStatusUpdateWorkflow(recipients, {
    variant: "completed",
    actorName: faculty.name,
    meetingTitle: appointment.title || "Meeting",
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    description: appointment.description,
    extraInfo: actionTaken,
    attendeeNames: names,
    isCreator: !appointment.student?.email,
    meetingType: appointment.student?.email ? "CONSULTATION" : "INTERNAL",
  }).catch((err) => {
    console.error("Failed to send completion notification:", err)
  })
}

export async function notifyAppointmentCancelled(appointment: ApptWithJoins, actorName: string) {
  const recipients = buildRecipients(appointment)
  if (recipients.length === 0) return

  const names = participantNames(recipients)

  await sendStatusUpdateWorkflow(recipients, {
    variant: "cancelled",
    actorName,
    meetingTitle: appointment.title || "Meeting",
    date: appointment.date,
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    description: appointment.description,
    attendeeNames: names,
    isCreator: false,
    meetingType: appointment.student?.email ? "CONSULTATION" : "INTERNAL",
  }).catch((err) => {
    console.error("Failed to send cancellation notification:", err)
  })
}
