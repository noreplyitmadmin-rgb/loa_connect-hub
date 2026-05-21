export type Role = "STUDENT" | "FACULTY" | "ADMIN"
export type AppointmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
export type MeetingStatus = "CONFIRMED" | "CANCELLED"
export type ParticipantStatus = "PENDING" | "ACCEPTED" | "DECLINED"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  createdAt: Date
}

export interface FacultySchedule {
  id: string
  facultyId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
  faculty?: User
}

export interface Appointment {
  id: string
  studentId: string
  facultyId: string
  scheduleId: string
  status: AppointmentStatus
  teamsLink: string | null
  requestedAt: Date
  updatedAt: Date
  student?: User
  faculty?: User
  schedule?: FacultySchedule
}

export interface InternalMeeting {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string
  endTime: string
  organizerId: string
  teamsEventId: string | null
  teamsLink: string | null
  status: MeetingStatus
  createdAt: Date
  organizer?: User
  participants?: InternalMeetingParticipant[]
}

export interface InternalMeetingParticipant {
  id: string
  meetingId: string
  userId: string
  status: ParticipantStatus
  user?: User
}

export interface AvailabilityRule {
  id: string
  facultyId: string
  dayOfWeek: number
  isBlocked: boolean
  startTime: string | null
  endTime: string | null
}

export interface UpsertAvailabilityRuleInput {
  facultyId: string
  dayOfWeek: number
  isBlocked: boolean
  startTime?: string | null
  endTime?: string | null
}
