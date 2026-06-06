export type Role = string
export type AppointmentStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
export type TeamsSyncStatus = "UNWRITTEN" | "WRITTEN" | "FAILED"
export type MeetingStatus = "CONFIRMED" | "CANCELLED"
export type ParticipantStatus = "PENDING" | "ACCEPTED" | "DECLINED"
export type AttendeeStatus = "INVITED" | "ACCEPTED" | "DECLINED"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  departmentId: string | null
  semesterId: string | null
  hasLoggedInBefore: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export interface Department {
  id: string
  name: string
  code: string
  deanId: string | null
}

export interface Appointment {
  id: string
  studentId: string
  facultyId: string
  sessionGroupId: string | null
  date: string
  startTime: string
  endTime: string
  title: string | null
  description: string | null
  actionTaken: string | null
  additionalRemarks: string | null
  status: AppointmentStatus
  teamsLink: string | null
  teamsSyncStatus: TeamsSyncStatus
  teamsSyncRetries: number
  teamsSyncError: string | null
  teamsSyncLastAttempt: Date | null
  requestedAt: Date
  updatedAt: Date
  student?: User
  faculty?: User
  attendees?: AppointmentAttendee[]
}

export interface AppointmentAttendee {
  id: string
  appointmentId: string
  userId: string
  status: AttendeeStatus
  isMandatory: boolean
  user?: User
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
  startDate: string
  endDate: string | null
}
