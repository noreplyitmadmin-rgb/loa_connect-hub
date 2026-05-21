export interface UserData {
  id: string
  name: string
  email: string
  passwordHash: string | null
  role: "STUDENT" | "FACULTY" | "ADMIN"
  createdAt: Date
}

export interface CreateUserInput {
  name: string
  email: string
  passwordHash?: string | null
  role: "STUDENT" | "FACULTY" | "ADMIN"
}

export interface ScheduleData {
  id: string
  facultyId: string
  date: string
  startTime: string
  endTime: string
  isAvailable: boolean
}

export interface CreateScheduleInput {
  facultyId: string
  date: string
  startTime: string
  endTime: string
}

export interface AppointmentData {
  id: string
  studentId: string
  facultyId: string
  scheduleId: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
  teamsLink: string | null
  requestedAt: Date
  updatedAt: Date
}

export interface CreateAppointmentInput {
  studentId: string
  facultyId: string
  scheduleId: string
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserData | null>
  findById(id: string): Promise<UserData | null>
  create(input: CreateUserInput): Promise<UserData>
  listByRole(role: string): Promise<UserData[]>
}

export interface IScheduleRepository {
  create(input: CreateScheduleInput): Promise<ScheduleData>
  listAvailable(): Promise<ScheduleData[]>
  listByFaculty(facultyId: string): Promise<ScheduleData[]>
  findById(id: string): Promise<ScheduleData | null>
  update(id: string, data: Partial<ScheduleData>): Promise<ScheduleData>
  delete(id: string): Promise<void>
}

export interface IAppointmentRepository {
  create(input: CreateAppointmentInput): Promise<AppointmentData>
  listByStudent(studentId: string): Promise<AppointmentData[]>
  listByFaculty(facultyId: string): Promise<AppointmentData[]>
  listAll(): Promise<AppointmentData[]>
  findById(id: string): Promise<AppointmentData | null>
  update(id: string, data: Partial<AppointmentData>): Promise<AppointmentData>
}

export interface AvailabilityRuleData {
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

export interface IAvailabilityRuleRepository {
  listByFaculty(facultyId: string): Promise<AvailabilityRuleData[]>
  findByFacultyAndDay(facultyId: string, dayOfWeek: number): Promise<AvailabilityRuleData | null>
  upsert(input: UpsertAvailabilityRuleInput): Promise<AvailabilityRuleData>
  delete(id: string): Promise<void>
}

// --- Internal Meetings ---

export type MeetingStatusData = "CONFIRMED" | "CANCELLED"
export type ParticipantStatusData = "PENDING" | "ACCEPTED" | "DECLINED"

export interface MeetingData {
  id: string
  title: string
  description: string | null
  date: string
  startTime: string
  endTime: string
  organizerId: string
  teamsEventId: string | null
  teamsLink: string | null
  status: MeetingStatusData
  createdAt: Date
}

export interface CreateMeetingInput {
  title: string
  description?: string | null
  date: string
  startTime: string
  endTime: string
  organizerId: string
}

export interface MeetingParticipantData {
  id: string
  meetingId: string
  userId: string
  status: ParticipantStatusData
}

export interface IMeetingRepository {
  create(input: CreateMeetingInput): Promise<MeetingData>
  findById(id: string): Promise<MeetingData | null>
  listByOrganizer(organizerId: string): Promise<MeetingData[]>
  listByParticipant(userId: string): Promise<MeetingData[]>
  update(id: string, data: Partial<MeetingData>): Promise<MeetingData>
  addParticipant(meetingId: string, userId: string): Promise<MeetingParticipantData>
  updateParticipantStatus(meetingId: string, userId: string, status: ParticipantStatusData): Promise<MeetingParticipantData>
  getParticipants(meetingId: string): Promise<MeetingParticipantData[]>
  listConflictingAppointments(facultyId: string, date: string, startTime: string, endTime: string): Promise<AppointmentData[]>
  listConflictingMeetings(facultyId: string, date: string, startTime: string, endTime: string): Promise<MeetingData[]>
}
