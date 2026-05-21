import { prisma } from "@/lib/prisma"
import type {
  IUserRepository,
  IScheduleRepository,
  IAppointmentRepository,
  IAvailabilityRuleRepository,
  IMeetingRepository,
  UserData,
  CreateUserInput,
  ScheduleData,
  CreateScheduleInput,
  AppointmentData,
  CreateAppointmentInput,
  AvailabilityRuleData,
  UpsertAvailabilityRuleInput,
  MeetingData,
  CreateMeetingInput,
  MeetingParticipantData,
} from "./interfaces"

export const userRepository: IUserRepository = {
  async findByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return null
    return user as UserData
  },
  async findById(id) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return null
    return user as UserData
  },
  async create(input) {
    const user = await prisma.user.create({ data: input })
    return user as UserData
  },
  async listByRole(role) {
    const users = await prisma.user.findMany({ where: { role: role as any } })
    return users as UserData[]
  },
}

export const scheduleRepository: IScheduleRepository = {
  async create(input) {
    const schedule = await prisma.facultySchedule.create({ data: input })
    return schedule as ScheduleData
  },
  async listAvailable() {
    const schedules = await prisma.facultySchedule.findMany({
      where: { isAvailable: true },
      include: { faculty: true },
    })
    return schedules as any
  },
  async listByFaculty(facultyId) {
    const schedules = await prisma.facultySchedule.findMany({
      where: { facultyId },
      orderBy: { date: "asc" },
    })
    return schedules as ScheduleData[]
  },
  async findById(id) {
    const schedule = await prisma.facultySchedule.findUnique({ where: { id } })
    if (!schedule) return null
    return schedule as ScheduleData
  },
  async update(id, data) {
    const schedule = await prisma.facultySchedule.update({ where: { id }, data })
    return schedule as ScheduleData
  },
  async delete(id) {
    await prisma.facultySchedule.delete({ where: { id } })
  },
}

export const appointmentRepository: IAppointmentRepository = {
  async create(input) {
    const appointment = await prisma.appointment.create({ data: input })
    return appointment as AppointmentData
  },
  async listByStudent(studentId) {
    const appointments = await prisma.appointment.findMany({
      where: { studentId },
      orderBy: { requestedAt: "desc" },
      include: { faculty: true, schedule: true },
    })
    return appointments as any
  },
  async listByFaculty(facultyId) {
    const appointments = await prisma.appointment.findMany({
      where: { facultyId },
      orderBy: { requestedAt: "desc" },
      include: { student: true, schedule: true },
    })
    return appointments as any
  },
  async listAll() {
    const appointments = await prisma.appointment.findMany({
      orderBy: { requestedAt: "desc" },
      include: { student: true, faculty: true, schedule: true },
    })
    return appointments as any
  },
  async findById(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { student: true, faculty: true, schedule: true },
    })
    if (!appointment) return null
    return appointment as any
  },
  async update(id, data) {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: data as any,
      include: { student: true, faculty: true, schedule: true },
    })
    return appointment as any
  },
}

export const availabilityRuleRepository: IAvailabilityRuleRepository = {
  async listByFaculty(facultyId) {
    const rules = await prisma.facultyAvailabilityRule.findMany({
      where: { facultyId },
      orderBy: { dayOfWeek: "asc" },
    })
    return rules as AvailabilityRuleData[]
  },
  async findByFacultyAndDay(facultyId, dayOfWeek) {
    const rule = await prisma.facultyAvailabilityRule.findUnique({
      where: { facultyId_dayOfWeek: { facultyId, dayOfWeek } },
    })
    if (!rule) return null
    return rule as AvailabilityRuleData
  },
  async upsert(input) {
    const rule = await prisma.facultyAvailabilityRule.upsert({
      where: { facultyId_dayOfWeek: { facultyId: input.facultyId, dayOfWeek: input.dayOfWeek } },
      update: { isBlocked: input.isBlocked, startTime: input.startTime ?? null, endTime: input.endTime ?? null },
      create: { facultyId: input.facultyId, dayOfWeek: input.dayOfWeek, isBlocked: input.isBlocked, startTime: input.startTime ?? null, endTime: input.endTime ?? null },
    })
    return rule as AvailabilityRuleData
  },
  async delete(id) {
    await prisma.facultyAvailabilityRule.delete({ where: { id } })
  },
}

export const meetingRepository: IMeetingRepository = {
  async create(input) {
    const meeting = await prisma.internalMeeting.create({ data: input })
    return meeting as MeetingData
  },
  async findById(id) {
    const meeting = await prisma.internalMeeting.findUnique({
      where: { id },
      include: { organizer: true, participants: { include: { user: true } } },
    })
    if (!meeting) return null
    return meeting as any
  },
  async listByOrganizer(organizerId) {
    const meetings = await prisma.internalMeeting.findMany({
      where: { organizerId },
      orderBy: { createdAt: "desc" },
      include: { participants: { include: { user: true } } },
    })
    return meetings as any
  },
  async listByParticipant(userId) {
    // Find meetings where user is a participant
    const participations = await prisma.internalMeetingParticipant.findMany({
      where: { userId },
      include: { meeting: { include: { organizer: true, participants: { include: { user: true } } } } },
    })
    return participations.map((p) => p.meeting) as any
  },
  async update(id, data) {
    const meeting = await prisma.internalMeeting.update({
      where: { id },
      data: data as any,
      include: { organizer: true, participants: { include: { user: true } } },
    })
    return meeting as any
  },
  async addParticipant(meetingId, userId) {
    const participant = await prisma.internalMeetingParticipant.create({
      data: { meetingId, userId },
    })
    return participant as MeetingParticipantData
  },
  async updateParticipantStatus(meetingId, userId, status) {
    const participant = await prisma.internalMeetingParticipant.update({
      where: { meetingId_userId: { meetingId, userId } },
      data: { status },
    })
    return participant as MeetingParticipantData
  },
  async getParticipants(meetingId) {
    const participants = await prisma.internalMeetingParticipant.findMany({
      where: { meetingId },
      include: { user: true },
    })
    return participants as any
  },
  async listConflictingAppointments(facultyId, date, startTime, endTime) {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [{ facultyId }, { studentId: facultyId }],
        status: { in: ["PENDING", "APPROVED"] },
        schedule: {
          date,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      } as any,
      include: { student: true, faculty: true, schedule: true },
    })
    return appointments as any
  },
  async listConflictingMeetings(facultyId, date, startTime, endTime) {
    const meetings = await prisma.internalMeeting.findMany({
      where: {
        OR: [
          { organizerId: facultyId },
          { participants: { some: { userId: facultyId } } },
        ],
        date,
        status: "CONFIRMED",
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      } as any,
      include: { organizer: true, participants: { include: { user: true } } },
    })
    return meetings as any
  },
}
