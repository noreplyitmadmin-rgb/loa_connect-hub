export interface UserData {
  id: string
  name: string
  email: string
  passwordHash: string | null
  role: "STUDENT" | "FACULTY" | "DEAN" | "ADMIN"
  departmentId: string | null
  course: string | null
  hasLoggedInBefore: boolean
  lastLoginAt: Date | null
  createdAt: Date
}

export interface CreateUserInput {
  name: string
  email: string
  passwordHash?: string | null
  role: "STUDENT" | "FACULTY" | "DEAN" | "ADMIN"
  departmentId?: string | null
  course?: string | null
}

export interface AppointmentData {
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
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
  teamsLink: string | null
  teamsSyncStatus: "UNWRITTEN" | "WRITTEN" | "FAILED"
  teamsSyncRetries: number
  teamsSyncError: string | null
  teamsSyncLastAttempt: Date | null
  requestedAt: Date
  updatedAt: Date
}

export interface DepartmentData {
  id: string
  name: string
  code: string
  deanId: string | null
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserData | null>
  findById(id: string): Promise<UserData | null>
  create(input: CreateUserInput): Promise<UserData>
  listByRole(role: string): Promise<UserData[]>
  listByDepartment(departmentId: string): Promise<UserData[]>
  update(id: string, data: Partial<UserData>): Promise<UserData>
}

export interface IDepartmentRepository {
  listAll(): Promise<DepartmentData[]>
  findById(id: string): Promise<DepartmentData | null>
  findByDeanId(deanId: string): Promise<DepartmentData | null>
  create(data: { name: string; code: string; deanId?: string | null }): Promise<DepartmentData>
  update(id: string, data: Partial<DepartmentData>): Promise<DepartmentData>
}

export interface AppointmentData {
  id: string
  studentId: string
  facultyId: string
  date: string
  startTime: string
  endTime: string
  title: string | null
  description: string | null
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "CANCELLED"
  teamsLink: string | null
  teamsSyncStatus: "UNWRITTEN" | "WRITTEN" | "FAILED"
  teamsSyncRetries: number
  teamsSyncError: string | null
  teamsSyncLastAttempt: Date | null
  requestedAt: Date
  updatedAt: Date
}

export interface CreateAppointmentInput {
  studentId: string
  facultyId: string
  sessionGroupId?: string | null
  date: string
  startTime: string
  endTime: string
  title?: string | null
  description?: string | null
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserData | null>
  findById(id: string): Promise<UserData | null>
  create(input: CreateUserInput): Promise<UserData>
  listByRole(role: string): Promise<UserData[]>
}

export interface AppointmentAttendeeData {
  id: string
  appointmentId: string
  userId: string
  status: "INVITED" | "ACCEPTED" | "DECLINED"
  isMandatory: boolean
}

export interface IAppointmentRepository {
  create(input: CreateAppointmentInput): Promise<AppointmentData>
  listByStudent(studentId: string): Promise<AppointmentData[]>
  listByFaculty(facultyId: string): Promise<AppointmentData[]>
  listAll(): Promise<AppointmentData[]>
  listPendingSync(): Promise<AppointmentData[]>
  findById(id: string): Promise<AppointmentData | null>
  update(id: string, data: Partial<AppointmentData>): Promise<AppointmentData>
  addAttendee(appointmentId: string, userId: string, isMandatory?: boolean): Promise<AppointmentAttendeeData>
  listAttendees(appointmentId: string): Promise<AppointmentAttendeeData[]>
  updateAttendeeStatus(appointmentId: string, userId: string, status: "INVITED" | "ACCEPTED" | "DECLINED"): Promise<AppointmentAttendeeData>
}

export interface AvailabilityRuleData {
  id: string
  facultyId: string
  dayOfWeek: number
  isBlocked: boolean
  startTime: string | null
  endTime: string | null
  startDate: string
  endDate: string | null
}

export interface UpsertAvailabilityRuleInput {
  facultyId: string
  dayOfWeek: number
  isBlocked: boolean
  startTime?: string | null
  endTime?: string | null
  startDate: string
  endDate?: string | null
}

export interface IAvailabilityRuleRepository {
  listByFaculty(facultyId: string): Promise<AvailabilityRuleData[]>
  findByFacultyAndDay(facultyId: string, dayOfWeek: number, startDate?: string): Promise<AvailabilityRuleData | null>
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
