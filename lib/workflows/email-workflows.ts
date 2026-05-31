import { sendConsultationInvite, sendApprovedWithTeamsLink, sendPasswordChangedEmail } from "@/lib/services/email"

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
