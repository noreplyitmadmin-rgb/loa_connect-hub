import { prisma } from "@/lib/prisma"
import type {
  IUserRepository,
  IDepartmentRepository,
  IMeetingRepository,
  IAvailabilityRuleRepository,
  IPasswordResetTokenRepository,
  IAuditLogRepository,
  UserData,
  CreateUserInput,
  DepartmentData,
  MeetingData,
  CreateMeetingInput,
  MeetingAttendeeData,
  MeetingTimeSlotData,
  AvailabilityRuleData,
  UpsertAvailabilityRuleInput,
  AuditLogData,
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
    const user = await prisma.user.create({ data: input as any })
    return user as UserData
  },
  async listByRole(role) {
    const users = await prisma.user.findMany({ where: { role } })
    return users as UserData[]
  },
  async listByDepartment(departmentId) {
    const users = await prisma.user.findMany({ where: { departmentId } })
    return users as UserData[]
  },
  async listByIds(ids) {
    const users = await prisma.user.findMany({ where: { id: { in: ids } } })
    return users as UserData[]
  },
  async listAll() {
    const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
    return users as UserData[]
  },
  async update(id, data) {
    const user = await prisma.user.update({ where: { id }, data: data as any })
    return user as UserData
  },
}

export const departmentRepository: IDepartmentRepository = {
  async listAll() {
    const depts = await prisma.department.findMany()
    return depts as DepartmentData[]
  },
  async findById(id) {
    const dept = await prisma.department.findUnique({ where: { id } })
    if (!dept) return null
    return dept as DepartmentData
  },
  async findByDeanId(deanId) {
    const dept = await prisma.department.findFirst({ where: { deanId } })
    if (!dept) return null
    return dept as DepartmentData
  },
  async create(data) {
    const dept = await prisma.department.create({ data: data as any })
    return dept as DepartmentData
  },
  async update(id, data) {
    const dept = await prisma.department.update({ where: { id }, data: data as any })
    return dept as DepartmentData
  },
}

const appointmentIncludes = {
  student: true,
  faculty: true,
  attendees: { include: { user: true } },
}

export const meetingsRepository: IMeetingRepository = {
  async create(input) {
    const appointment = await prisma.appointment.create({ data: input })
    return appointment as MeetingData
  },
  async listByStudent(studentId) {
    const appointments = await prisma.appointment.findMany({
      where: { studentId },
      orderBy: { requestedAt: "desc" },
      include: appointmentIncludes,
    })
    return appointments as MeetingData[]
  },
  async listByFaculty(facultyId) {
    const appointments = await prisma.appointment.findMany({
      where: { facultyId },
      orderBy: { requestedAt: "desc" },
      include: appointmentIncludes,
    })
    return appointments as MeetingData[]
  },
  async listAll() {
    const appointments = await prisma.appointment.findMany({
      orderBy: { requestedAt: "desc" },
      include: appointmentIncludes,
    })
    return appointments as MeetingData[]
  },
  async listPendingSync() {
    const appointments = await prisma.appointment.findMany({
      where: {
        status: "APPROVED",
        teamsSyncStatus: "UNWRITTEN",
      },
      include: appointmentIncludes,
      orderBy: { updatedAt: "asc" },
    })
    return appointments as MeetingData[]
  },
  async findById(id) {
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: appointmentIncludes,
    })
    if (!appointment) return null
    return appointment as MeetingData
  },
  async update(id, data) {
    const appointment = await prisma.appointment.update({
      where: { id },
      data: data as any,
      include: appointmentIncludes,
    })
    return appointment as MeetingData
  },
  async addAttendee(meetingId, userId, isMandatory = true) {
    const attendee = await prisma.appointmentAttendee.create({
      data: { appointmentId: meetingId, userId, isMandatory },
    })
    return attendee as MeetingAttendeeData
  },
  async listAttendees(meetingId) {
    const attendees = await prisma.appointmentAttendee.findMany({
      where: { appointmentId: meetingId },
      include: { user: true },
    })
    return attendees as MeetingAttendeeData[]
  },
  async updateAttendeeStatus(meetingId, userId, status) {
    const attendee = await prisma.appointmentAttendee.update({
      where: { appointmentId_userId: { appointmentId: meetingId, userId } },
      data: { status },
      include: { user: true },
    })
    return attendee as MeetingAttendeeData
  },
  async addTimeSlot(meetingId, date, startTime, endTime) {
    const slot = await prisma.appointmentTimeSlot.create({
      data: { appointmentId: meetingId, date, startTime, endTime },
    })
    return slot as MeetingTimeSlotData
  },
  async removeTimeSlot(slotId) {
    await prisma.appointmentTimeSlot.delete({ where: { id: slotId } })
  },
  async listTimeSlots(meetingId) {
    const slots = await prisma.appointmentTimeSlot.findMany({
      where: { appointmentId: meetingId },
      orderBy: { createdAt: "asc" },
    })
    return slots as MeetingTimeSlotData[]
  },
  async listStudentConflictingSlots(studentId, date, startTime, endTime, excludeSessionGroupId) {
    const where: any = {
      appointment: { studentId, status: "APPROVED" },
      date,
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    }
    if (excludeSessionGroupId) {
      where.appointment.sessionGroupId = { not: excludeSessionGroupId }
    }
    const slots = await prisma.appointmentTimeSlot.findMany({
      where,
      include: { appointment: true },
    })
    return slots as any
  },
  async listConflictingSlots(facultyIds, date, startTime, endTime) {
    const slots = await prisma.appointmentTimeSlot.findMany({
      where: {
        appointment: { facultyId: { in: facultyIds } },
        date,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      } as any,
      include: { appointment: true },
    })
    return slots as any
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
  async findByFacultyAndDay(facultyId, dayOfWeek, startDate) {
    if (!startDate) return null
    const rule = await prisma.facultyAvailabilityRule.findUnique({
      where: { facultyId_dayOfWeek_startDate: { facultyId, dayOfWeek, startDate } },
    })
    if (!rule) return null
    return rule as AvailabilityRuleData
  },
  async upsert(input) {
    const rule = await prisma.facultyAvailabilityRule.upsert({
      where: { facultyId_dayOfWeek_startDate: { facultyId: input.facultyId, dayOfWeek: input.dayOfWeek, startDate: input.startDate } },
      update: { isBlocked: input.isBlocked, startTime: input.startTime ?? null, endTime: input.endTime ?? null, endDate: input.endDate ?? null },
      create: { facultyId: input.facultyId, dayOfWeek: input.dayOfWeek, isBlocked: input.isBlocked, startTime: input.startTime ?? null, endTime: input.endTime ?? null, startDate: input.startDate, endDate: input.endDate ?? null },
    })
    return rule as AvailabilityRuleData
  },
  async delete(id) {
    await prisma.facultyAvailabilityRule.delete({ where: { id } })
  },
}

export const passwordResetTokenRepository: IPasswordResetTokenRepository = {
  async create(email, token, expiresAt) {
    await prisma.passwordResetToken.create({
      data: { email, token, expiresAt },
    })
  },
  async findByToken(token) {
    const record = await prisma.passwordResetToken.findUnique({ where: { token } })
    return record as any
  },
  async markUsed(id) {
    await prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    })
  },
  async findByEmail(email) {
    const record = await prisma.passwordResetToken.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    })
    return record as any
  },
}

export const auditLogRepository: IAuditLogRepository = {
  async create(data) {
    const log = await prisma.auditLog.create({ data: data as any })
    return log as AuditLogData
  },
  async list(limit = 100) {
    const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: limit })
    return logs as AuditLogData[]
  },
}
