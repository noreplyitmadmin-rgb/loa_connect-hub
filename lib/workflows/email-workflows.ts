import { sendConsultationInvite, sendApprovedWithTeamsLink, sendPasswordChangedEmail, sendBookingAcknowledgement, sendMeetingInviteWithICS, sendStatusUpdateEmail } from "@/lib/services/email"

export async function sendConsultationInviteWorkflow(
  to: { email: string; name: string },
  data: Parameters<typeof sendConsultationInvite>[1],
  icalString?: string
) {
  "use workflow"

  await sendConsultationInvite(to, data, icalString)
}

export async function sendApprovedWorkflow(
  to: { email: string; name: string },
  ccList: { email: string; name: string }[],
  data: Parameters<typeof sendApprovedWithTeamsLink>[2],
  icalString?: string
) {
  "use workflow"

  await sendApprovedWithTeamsLink(to, ccList, data, icalString)
}

export async function sendPasswordChangedWorkflow(
  email: string,
  name: string
) {
  "use workflow"

  await sendPasswordChangedEmail(email, name)
}

import type { ApptWithJoins } from "@/lib/controllers/appointments"

export async function sendAppointmentCreatedWorkflow(
  appointment: Record<string, unknown>,
  creatorId: string
) {
  "use workflow"

  const { sendAppointmentCreatedEmail } = await import(
    "@/lib/controllers/appointments"
  )
  await sendAppointmentCreatedEmail(appointment as unknown as ApptWithJoins, creatorId)
}

export async function sendConsultationApprovedWorkflow(
  appointment: Record<string, unknown>
) {
  "use workflow"

  const { sendConsultationApprovedEmail } = await import(
    "@/lib/controllers/appointments"
  )
  await sendConsultationApprovedEmail(appointment as unknown as ApptWithJoins)
}

export async function sendMeetingInviteWithAcknowledgementWorkflow(
  primaryUser: { email: string; name: string },
  ccEmails: string[],
  inviteData: {
    organizerName: string
    title: string
    description?: string | null
    date: string
    startTime: string
    endTime: string
    participantNames: string[]
    viewUrl: string
  },
  icalString: string | undefined,
  creator: { email: string; name: string } | null,
  acknowledgementData: {
    meetingTitle: string
    attendeeNames: string[]
    date: string
    startTime: string
    endTime: string
    viewUrl: string
    variant: "request" | "booking"
  } | null
) {
  "use workflow"

  await sendInviteStep(primaryUser, ccEmails, inviteData, icalString)
  if (creator && acknowledgementData) {
    await sendAcknowledgementStep(creator, acknowledgementData)
  }
}

export async function sendConsultationInviteWithAcknowledgementWorkflow(
  primaryUser: { email: string; name: string },
  ccEmails: string[],
  inviteData: {
    studentName: string
    studentEmail: string
    facultyName: string
    facultyEmail: string
    date: string
    startTime: string
    endTime: string
    title?: string | null
    description?: string | null
    viewUrl: string
  },
  icalString: string | undefined,
  creator: { email: string; name: string } | null,
  acknowledgementData: {
    meetingTitle: string
    attendeeNames: string[]
    date: string
    startTime: string
    endTime: string
    viewUrl: string
    variant: "request" | "booking"
  } | null
) {
  "use workflow"

  await sendConsultationInviteStep(primaryUser, ccEmails, inviteData, icalString)
  if (creator && acknowledgementData) {
    await sendAcknowledgementStep(creator, acknowledgementData)
  }
}

async function sendConsultationInviteStep(
  primaryUser: { email: string; name: string },
  ccEmails: string[],
  inviteData: {
    studentName: string
    studentEmail: string
    facultyName: string
    facultyEmail: string
    date: string
    startTime: string
    endTime: string
    title?: string | null
    description?: string | null
    viewUrl: string
  },
  icalString: string | undefined
) {
  "use step"

  await sendConsultationInvite(
    { email: primaryUser.email, name: primaryUser.name },
    {
      studentName: inviteData.studentName,
      studentEmail: inviteData.studentEmail,
      facultyName: inviteData.facultyName,
      facultyEmail: inviteData.facultyEmail,
      date: inviteData.date,
      startTime: inviteData.startTime,
      endTime: inviteData.endTime,
      title: inviteData.title,
      description: inviteData.description,
      viewUrl: inviteData.viewUrl,
      cc: ccEmails.length > 0 ? ccEmails : undefined,
    },
    icalString,
  )
}

async function sendInviteStep(
  primaryUser: { email: string; name: string },
  ccEmails: string[],
  inviteData: {
    organizerName: string
    title: string
    description?: string | null
    date: string
    startTime: string
    endTime: string
    participantNames: string[]
    viewUrl: string
  },
  icalString: string | undefined
) {
  "use step"

  await sendMeetingInviteWithICS(
    { email: primaryUser.email, name: primaryUser.name },
    { ...inviteData, cc: ccEmails.length > 0 ? ccEmails : undefined },
    icalString,
  )
}

async function sendAcknowledgementStep(
  creator: { email: string; name: string },
  data: {
    meetingTitle: string
    attendeeNames: string[]
    date: string
    startTime: string
    endTime: string
    viewUrl: string
    variant: "request" | "booking"
  }
) {
  "use step"

  await sendBookingAcknowledgement({ email: creator.email, name: creator.name }, data)
}

export async function sendStatusUpdateWorkflow(
  to: { email: string; name: string },
  cc: { email: string; name: string }[],
  data: {
    variant: "cancelled" | "completed" | "accepted"
    actorName: string
    meetingTitle: string
    date: string
    startTime: string
    endTime: string
    description?: string | null
    viewUrl: string
    extraInfo?: string | null
    attendeeNames: string[]
    isCreator: boolean
    meetingType: "CONSULTATION" | "INTERNAL"
  }
) {
  "use workflow"

  await sendStatusUpdateEmail(to, cc, data)
}
