// ── User ────────────────────────────────────────────────

export interface UserData {
  id: string
  name: string
  email: string
  passwordHash: string | null
  role: string
  departmentId: string | null
  course: string | null
  isDisabled: boolean
  hasLoggedInBefore: boolean
  lastLoginAt: Date | null
  tokenVersion: number
  onboardingVersion: number
  createdAt: Date
  deletedAt: Date | null
}

export interface CreateUserInput {
  name: string
  email: string
  passwordHash?: string | null
  role: string
  departmentId?: string | null
  course?: string | null
}

export interface ListUsersOptions {
  includeDeleted?: boolean
}

export interface IUserRepository {
  findByEmail(email: string): Promise<UserData | null>
  findById(id: string): Promise<UserData | null>
  create(input: CreateUserInput): Promise<UserData>
  listByRole(role: string, options?: ListUsersOptions): Promise<UserData[]>
  listByDepartment(departmentId: string, options?: ListUsersOptions): Promise<UserData[]>
  listByIds(ids: string[], options?: ListUsersOptions): Promise<UserData[]>
  listAll(options?: ListUsersOptions): Promise<UserData[]>
  update(id: string, data: Partial<UserData>): Promise<UserData>
  softDelete(id: string): Promise<void>
  restore(id: string): Promise<void>
  permanentDelete(id: string): Promise<void>
  listDeleted(): Promise<UserData[]>
}

// ── Department ──────────────────────────────────────────

export interface DepartmentData {
  id: string
  name: string
  code: string
  deanId: string | null
  isDisabled: boolean
}

export interface IDepartmentRepository {
  listAll(): Promise<DepartmentData[]>
  findById(id: string): Promise<DepartmentData | null>
  findByDeanId(deanId: string): Promise<DepartmentData | null>
  create(data: { name: string; code: string; deanId?: string | null }): Promise<DepartmentData>
  update(id: string, data: Partial<DepartmentData>): Promise<DepartmentData>
}

// ── Appointment ─────────────────────────────────────────

export interface AppointmentData {
  id: string
  studentId: string
  facultyId: string
  createdByEmail: string
  meetingType: "CONSULTATION"
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

export interface CreateAppointmentInput {
  studentId: string | null
  facultyId: string
  createdByEmail: string
  meetingType?: "CONSULTATION"
  sessionGroupId?: string | null
  date: string
  startTime: string
  endTime: string
  title?: string | null
  description?: string | null
}

export interface AppointmentAttendeeData {
  id: string
  appointmentId: string
  userId: string
  status: "INVITED" | "ACCEPTED" | "DECLINED"
  isMandatory: boolean
}

export interface AppointmentTimeSlotData {
  id: string
  appointmentId: string
  date: string
  startTime: string
  endTime: string
  teamsLink: string | null
  createdAt: Date
}

export interface AppointmentFileData {
  id: string
  appointmentId: string
  fileName: string
  fileType: string
  fileData: string
  fileSize: number
  createdAt: Date
}

export interface IAppointmentRepository {
  create(input: CreateAppointmentInput): Promise<AppointmentData>
  listByStudent(studentId: string): Promise<AppointmentData[]>
  listByFaculty(facultyId: string): Promise<AppointmentData[]>
  listByParticipant(userId: string): Promise<AppointmentData[]>
  listAll(): Promise<AppointmentData[]>
  listPendingSync(): Promise<AppointmentData[]>
  findById(id: string): Promise<AppointmentData | null>
  update(id: string, data: Partial<AppointmentData>): Promise<AppointmentData>
  addAttendee(appointmentId: string, userId: string, isMandatory?: boolean): Promise<AppointmentAttendeeData>
  listAttendees(appointmentId: string): Promise<AppointmentAttendeeData[]>
  updateAttendeeStatus(appointmentId: string, userId: string, status: "INVITED" | "ACCEPTED" | "DECLINED"): Promise<AppointmentAttendeeData>
  addTimeSlot(appointmentId: string, date: string, startTime: string, endTime: string): Promise<AppointmentTimeSlotData>
  removeTimeSlot(slotId: string): Promise<void>
  updateTimeSlot(id: string, data: Partial<Pick<AppointmentTimeSlotData, "teamsLink">>): Promise<AppointmentTimeSlotData>
  findTimeSlotById(id: string): Promise<AppointmentTimeSlotData | null>
  listTimeSlots(appointmentId: string): Promise<AppointmentTimeSlotData[]>
  listStudentConflictingSlots(studentId: string, date: string, startTime: string, endTime: string, excludeSessionGroupId?: string): Promise<AppointmentTimeSlotData[]>
  listConflictingSlots(facultyIds: string[], date: string, startTime: string, endTime: string): Promise<AppointmentTimeSlotData[]>
  listFacultyAppointmentsByDateRange(facultyId: string, startDate: string, endDate: string, status?: string): Promise<AppointmentData[]>
  addFile(appointmentId: string, data: { fileName: string; fileType: string; fileData: string; fileSize: number }): Promise<AppointmentFileData>
  listFiles(appointmentId: string): Promise<AppointmentFileData[]>
}

// ── Availability Rule ───────────────────────────────────

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

// ── Password Reset Token ────────────────────────────────

export interface PasswordResetTokenData {
  id: string
  email: string
  token: string
  expiresAt: Date
  usedAt: Date | null
  createdAt: Date
}

export interface IPasswordResetTokenRepository {
  create(email: string, token: string, expiresAt: Date): Promise<void>
  findByToken(token: string): Promise<PasswordResetTokenData | null>
  markUsed(id: string): Promise<void>
  findByEmail(email: string): Promise<PasswordResetTokenData | null>
}

// ── Audit Log ───────────────────────────────────────────

export interface AuditLogData {
  id: string
  userId: string | null
  email: string | null
  action: string
  details: string | null
  createdAt: Date
}

export interface IAuditLogRepository {
  create(data: { userId?: string | null; email?: string | null; action: string; details?: string | null }): Promise<AuditLogData>
  list(limit?: number, offset?: number): Promise<AuditLogData[]>
}

// ── Reports ─────────────────────────────────────────────

export interface FacultyStatsData {
  facultyId: string
  facultyName: string
  total: number
  completed: number
  pending: number
  cancelled: number
  completionRate: number
}

export interface RawAppointmentData {
  id: string
  facultyId: string
  facultyName: string
  studentName: string
  date: string
  startTime: string
  endTime: string
  status: string
  title: string | null
}

export interface ConsultationSummaryData {
  id: string
  facultyId: string
  facultyName: string
  studentName: string
  studentId: string
  date: string
  startTime: string
  endTime: string
  status: string
  title: string | null
  description: string | null
  actionTaken: string | null
  additionalRemarks: string | null
  hasFiles: boolean
}

export interface DepartmentFrequencyEntry {
  month: string
  monthName: string
  year: number
  count: number
}

export interface FacultyFrequencyData {
  facultyId: string
  facultyName: string
  total: number
  averagePerMonth: number
  monthlyCounts: { month: string; monthName: string; count: number }[]
}

export interface DepartmentYearlyEntry {
  year: number
  count: number
}

export interface FacultyYearlyData {
  facultyId: string
  facultyName: string
  total: number
  averagePerYear: number
  yearlyCounts: { year: number; count: number }[]
}

export interface DepartmentSummary {
  id: string
  name: string
  facultyCount: number
  total: number
  completed: number
  pending: number
  cancelled: number
  completionRate: number
}

export interface IReportsRepository {
  getDepartmentConsultationStats(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string; status?: string }
  ): Promise<FacultyStatsData[]>

  getDepartmentConsultationAppointments(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string; status?: string }
  ): Promise<RawAppointmentData[]>

  getConsultationSummaries(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string; status?: string }
  ): Promise<ConsultationSummaryData[]>

  getDepartmentFrequency(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<DepartmentFrequencyEntry[]>

  getFacultyFrequency(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<FacultyFrequencyData[]>

  getDepartmentYearlyFrequency(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<DepartmentYearlyEntry[]>

  getFacultyYearlyFrequency(
    departmentId: string,
    filters?: { startDate?: string; endDate?: string }
  ): Promise<FacultyYearlyData[]>
}
