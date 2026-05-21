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
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED"
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
