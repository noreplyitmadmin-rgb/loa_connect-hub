export type RecipientType = "student" | "faculty" | "mandatory" | "optional"

export interface ApptUser {
  id: string
  name: string
  email: string
  role?: string
}

export interface ApptAttendee {
  userId: string
  isMandatory: boolean
  user?: ApptUser
}

export interface ApptWithUsers {
  id?: string
  student?: ApptUser | null
  faculty?: ApptUser | null
  attendees?: ApptAttendee[]
}

export function getRecipientType(
  userEmail: string,
  appointment: ApptWithUsers
): RecipientType {
  if (appointment.student?.email === userEmail) return "student"
  if (appointment.faculty?.email === userEmail) return "faculty"

  const attendee = (appointment.attendees || []).find(
    a => a.user?.email === userEmail
  )
  if (attendee) {
    return attendee.isMandatory ? "mandatory" : "optional"
  }

  return "faculty"
}

export function getAppointmentUrl(
  appointmentId: string,
  recipientType: RecipientType
): string {
  const host =
    process.env.NEXT_PUBLIC_APP_URL ||
    `http://localhost:${process.env.PORT || 3000}`

  if (recipientType === "student") {
    return `${host}/student/meetings/${appointmentId}`
  }

  if (recipientType === "optional") {
    return `${host}/faculty/meetings/${appointmentId}?role=optional`
  }

  return `${host}/faculty/meetings/${appointmentId}`
}
