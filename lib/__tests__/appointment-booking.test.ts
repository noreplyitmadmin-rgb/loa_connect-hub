import { describe, it, expect, vi, beforeEach } from "vitest"

const mockUserRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  listByDepartment: vi.fn(),
}))

const mockAppointmentRepo = vi.hoisted(() => ({
  create: vi.fn(),
  findById: vi.fn(),
  addTimeSlot: vi.fn(),
  addAttendee: vi.fn(),
  listStudentConflictingSlots: vi.fn(),
  listConflictingSlots: vi.fn(),
}))

vi.mock("@/lib/repositories/factory", () => ({
  userRepository: mockUserRepo,
  appointmentRepository: mockAppointmentRepo,
}))

const mockSendCreated = vi.hoisted(() => vi.fn())
const mockSendApproved = vi.hoisted(() => vi.fn())
const mockSendInvite = vi.hoisted(() => vi.fn())
const mockSendMeetingAck = vi.hoisted(() => vi.fn())
const mockSendConsultAck = vi.hoisted(() => vi.fn())
const mockSendStatus = vi.hoisted(() => vi.fn())

vi.mock("@/lib/workflows/email-workflows", () => ({
  sendAppointmentCreatedWorkflow: mockSendCreated,
  sendConsultationApprovedWorkflow: mockSendApproved,
  sendConsultationInviteWorkflow: mockSendInvite,
  sendMeetingInviteWithAcknowledgementWorkflow: mockSendMeetingAck,
  sendConsultationInviteWithAcknowledgementWorkflow: mockSendConsultAck,
  sendStatusUpdateWorkflow: mockSendStatus,
}))

const mockGenerateICal = vi.hoisted(() => vi.fn().mockReturnValue(""))

vi.mock("@/lib/services/ical", () => ({
  generateICal: mockGenerateICal,
}))

import { requestAppointment } from "@/features/appointments/appointments.controller"
import type { UserData, AppointmentData } from "@/lib/types"

const BASE_INPUT = {
  createdByUserId: "creator-1",
  studentId: null,
  facultyId: "faculty-1",
  date: "2026-06-15",
  startTime: "10:00",
  endTime: "11:00",
  title: "Test Meeting",
  description: "A test",
}

function mockUser(overrides: Partial<UserData> = {}): UserData {
  return {
    id: "creator-1",
    email: "creator@test.com",
    name: "Creator",
    role: "FACULTY",
    passwordHash: null,
    departmentId: null,
    course: null,
    isDisabled: false,
    hasLoggedInBefore: true,
    lastLoginAt: null,
    tokenVersion: 0,
    onboardingVersion: 0,
    createdAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as UserData
}

function mockAppointment(overrides: Partial<AppointmentData> = {}): AppointmentData {
  return {
    id: "apt-1",
    studentId: "student-1",
    facultyId: "faculty-1",
    createdByEmail: "creator@test.com",
    meetingType: "CONSULTATION",
    sessionGroupId: null,
    date: "2026-06-15",
    startTime: "10:00",
    endTime: "11:00",
    title: "Test Meeting",
    description: null,
    actionTaken: null,
    additionalRemarks: null,
    status: "APPROVED",
    teamsLink: null,
    teamsSyncStatus: "UNWRITTEN",
    teamsSyncRetries: 0,
    teamsSyncError: null,
    teamsSyncLastAttempt: null,
    requestedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  mockSendCreated.mockReturnValue({ catch: vi.fn() })
  mockSendApproved.mockReturnValue({ catch: vi.fn() })
  mockSendInvite.mockReturnValue({ catch: vi.fn() })
  mockSendMeetingAck.mockReturnValue({ catch: vi.fn() })
  mockSendConsultAck.mockReturnValue({ catch: vi.fn() })
  mockSendStatus.mockReturnValue({ catch: vi.fn() })
})

describe("requestAppointment — validation", () => {
  it("throws if no timeslots provided", async () => {
    await expect(requestAppointment({ ...BASE_INPUT, date: undefined as unknown as string, startTime: undefined as unknown as string, endTime: undefined as unknown as string }))
      .rejects.toThrow("At least one timeslot")
  })

  it("throws if duration is too short", async () => {
    await expect(requestAppointment({ ...BASE_INPUT, startTime: "10:00", endTime: "10:15" }))
      .rejects.toThrow("Invalid duration")
  })

  it("throws if duration is too long", async () => {
    await expect(requestAppointment({ ...BASE_INPUT, startTime: "09:00", endTime: "18:00" }))
      .rejects.toThrow("Invalid duration")
  })

  it("throws if time is not on a 15-minute boundary", async () => {
    await expect(requestAppointment({ ...BASE_INPUT, startTime: "10:07", endTime: "11:00" }))
      .rejects.toThrow("Time must be on a 15-minute boundary")
  })

  it("throws if slots overlap", async () => {
    const input = {
      ...BASE_INPUT,
      timeSlots: [
        { date: "2026-06-15", startTime: "10:00", endTime: "11:00" },
        { date: "2026-06-15", startTime: "10:30", endTime: "11:30" },
      ],
    } as typeof BASE_INPUT & { timeSlots: { date: string; startTime: string; endTime: string }[] }
    await expect(requestAppointment(input))
      .rejects.toThrow("Timeslots cannot overlap")
  })
})

describe("requestAppointment — student conflicts", () => {
  const studentInput = {
    createdByUserId: "student-1",
    studentId: "student-1",
    facultyId: "faculty-1",
    date: "2026-06-15",
    startTime: "10:00",
    endTime: "11:00",
    title: "My Consultation",
  }

  beforeEach(() => {
    mockUserRepo.findById.mockImplementation(async (id: string) => {
      if (id === "student-1") return mockUser({ id: "student-1", role: "STUDENT" })
      if (id === "other-student") return mockUser({ id: "other-student", role: "STUDENT" })
      if (id === "faculty-1") return mockUser({ id: "faculty-1", role: "FACULTY", name: "Dr. Faculty" })
      return null
    })
  })

  it("blocks student when they have a conflicting consultation", async () => {
    mockAppointmentRepo.listStudentConflictingSlots.mockResolvedValue([
      { id: "slot-1", appointmentId: "conflict-apt", date: "2026-06-15", startTime: "10:00", endTime: "11:00", teamsLink: null, createdAt: new Date(), appointment: { id: "conflict-apt", sessionGroupId: "other", status: "PENDING", meetingType: "CONSULTATION" } },
    ])
    await expect(requestAppointment(studentInput)).rejects.toThrow(
      "You already have an appointment that overlaps with this time"
    )
  })

  it("blocks when the target faculty has a conflicting approved appointment", async () => {
    mockAppointmentRepo.listStudentConflictingSlots.mockResolvedValue([])
    mockAppointmentRepo.listConflictingSlots.mockResolvedValue([
      { id: "slot-f1", appointmentId: "conflict-apt-faculty", date: "2026-06-15", startTime: "10:00", endTime: "11:00", teamsLink: null, createdAt: new Date(), appointment: { id: "conflict-apt-faculty", sessionGroupId: "other", status: "APPROVED" } },
    ])
    await expect(requestAppointment(studentInput)).rejects.toThrow(
      "Dr. Faculty is already booked at this time"
    )
  })

  it("throws when a student tries to invite another student", async () => {
    await expect(requestAppointment({ ...studentInput, attendeeIds: ["other-student"] })).rejects.toThrow(
      "Students cannot invite other students"
    )
  })
})

describe("requestAppointment — successful student booking", () => {
  beforeEach(() => {
    mockUserRepo.findById.mockImplementation(async (id: string) => {
      if (id === "student-1") return mockUser({ id: "student-1", role: "STUDENT" })
      if (id === "faculty-1") return mockUser({ id: "faculty-1", role: "FACULTY", name: "Dr. Faculty" })
      return null
    })
    mockAppointmentRepo.listStudentConflictingSlots.mockResolvedValue([])
    mockAppointmentRepo.listConflictingSlots.mockResolvedValue([])
    mockAppointmentRepo.create.mockResolvedValue(mockAppointment({ id: "apt-1", status: "PENDING" }))
    mockAppointmentRepo.findById.mockResolvedValue(mockAppointment({ id: "apt-1", status: "PENDING" }))
    mockAppointmentRepo.addTimeSlot.mockResolvedValue({ id: "slot-1", appointmentId: "apt-1", date: "2026-06-15", startTime: "10:00", endTime: "11:00", teamsLink: null, createdAt: new Date() })
  })

  it("creates a consultation for a student", async () => {
    const result = await requestAppointment({
      createdByUserId: "student-1",
      studentId: "student-1",
      facultyId: "faculty-1",
      date: "2026-06-15",
      startTime: "10:00",
      endTime: "11:00",
      title: "My Consultation",
      description: "Need help",
    })

    expect(result.appointment).toBeDefined()
    expect(result.appointment!.id).toBe("apt-1")
    expect(mockAppointmentRepo.create).toHaveBeenCalledTimes(1)
    expect(mockAppointmentRepo.addTimeSlot).toHaveBeenCalledTimes(1)
    expect(mockAppointmentRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        studentId: "student-1",
        facultyId: "faculty-1",
        meetingType: "CONSULTATION",
        title: "My Consultation",
        description: "Need help",
      })
    )
  })
})
