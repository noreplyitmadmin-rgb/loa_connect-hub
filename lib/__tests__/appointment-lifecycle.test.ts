import { describe, it, expect, vi } from "vitest"
import type { AppointmentData } from "@/lib/types"

const mockAppointmentRepo = vi.hoisted(() => ({
  findById: vi.fn(),
  update: vi.fn(),
  updateAttendeeStatus: vi.fn(),
}))

vi.mock("@/lib/repositories/factory", () => ({
  appointmentRepository: mockAppointmentRepo,
}))

import {
  acceptAppointment,
  declineAppointment,
  completeAppointment,
  cancelAppointment,
  studentResendInvitation,
  attendeeAcceptAppointment,
  attendeeDeclineAppointment,
} from "@/features/appointments/appointments.service"

function mockAppt(overrides: Partial<AppointmentData> = {}): AppointmentData {
  return {
    id: "apt-1",
    studentId: "student-1",
    facultyId: "faculty-1",
    createdByEmail: "student@test.com",
    meetingType: "CONSULTATION",
    sessionGroupId: null,
    date: "2026-06-15",
    startTime: "10:00",
    endTime: "11:00",
    title: "Test",
    description: null,
    actionTaken: null,
    additionalRemarks: null,
    status: "PENDING",
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

describe("acceptAppointment", () => {
  it("updates status to APPROVED", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    const result = await acceptAppointment("apt-1", "faculty-1")
    expect(result.status).toBe("APPROVED")
    expect(mockAppointmentRepo.update).toHaveBeenCalledWith("apt-1", { status: "APPROVED", teamsSyncStatus: "UNWRITTEN" })
  })

  it("throws if appointment not found", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(null)
    await expect(acceptAppointment("apt-1", "faculty-1")).rejects.toThrow("Appointment not found")
  })

  it("throws if wrong faculty", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    await expect(acceptAppointment("apt-1", "faculty-2")).rejects.toThrow("Unauthorized")
  })

  it("throws if not pending", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    await expect(acceptAppointment("apt-1", "faculty-1")).rejects.toThrow("Appointment is not pending")
  })
})

describe("declineAppointment", () => {
  it("updates status to REJECTED", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "REJECTED" }))
    const result = await declineAppointment("apt-1", "faculty-1")
    expect(result.status).toBe("REJECTED")
  })

  it("throws if not pending", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    await expect(declineAppointment("apt-1", "faculty-1")).rejects.toThrow("Appointment is not pending")
  })
})

describe("completeAppointment", () => {
  it("updates status to COMPLETED with action taken", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "COMPLETED", actionTaken: "Reviewed the paper and provided feedback." }))
    const action = "Reviewed the paper and provided feedback. This is a sufficiently long action string for testing purposes."
    const result = await completeAppointment("apt-1", "faculty-1", action)
    expect(result.status).toBe("COMPLETED")
  })

  it("throws if action taken is too short", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    await expect(completeAppointment("apt-1", "faculty-1", "Too short")).rejects.toThrow("Actions taken must be at least 100 characters")
  })

  it("throws if not approved", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "PENDING" }))
    await expect(completeAppointment("apt-1", "faculty-1", "x".repeat(100))).rejects.toThrow("Appointment is not approved")
  })
})

describe("cancelAppointment", () => {
  it("cancels when called by the creator via email", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "CANCELLED" }))
    const result = await cancelAppointment("apt-1", "student-1", "student@test.com")
    expect(result.status).toBe("CANCELLED")
  })

  it("cancels when called by the faculty", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "APPROVED" }))
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "CANCELLED" }))
    const result = await cancelAppointment("apt-1", "faculty-1")
    expect(result.status).toBe("CANCELLED")
  })

  it("throws if neither creator nor faculty", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    await expect(cancelAppointment("apt-1", "other-user")).rejects.toThrow("Unauthorized")
  })

  it("faculty can only cancel approved appointments", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "PENDING" }))
    await expect(cancelAppointment("apt-1", "faculty-1")).rejects.toThrow("Only approved appointments can be cancelled by faculty")
  })
})

describe("studentResendInvitation", () => {
  it("resets state for rejected appointment", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "REJECTED", studentId: "student-1" }))
    mockAppointmentRepo.update.mockResolvedValue(mockAppt({ status: "PENDING" }))
    const result = await studentResendInvitation("apt-1", "student-1")
    expect(result.status).toBe("PENDING")
    expect(mockAppointmentRepo.update).toHaveBeenCalledWith("apt-1", {
      status: "PENDING",
      teamsLink: null,
      teamsSyncStatus: "UNWRITTEN",
      teamsSyncRetries: 0,
      teamsSyncError: null,
      teamsSyncLastAttempt: null,
    })
  })

  it("throws if not the student owner", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt({ status: "REJECTED", studentId: "student-1" }))
    await expect(studentResendInvitation("apt-1", "other-student")).rejects.toThrow("Unauthorized")
  })
})

describe("attendeeAcceptAppointment", () => {
  it("updates attendee status to ACCEPTED", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    mockAppointmentRepo.updateAttendeeStatus.mockResolvedValue({ id: "att-1", appointmentId: "apt-1", userId: "user-1", status: "ACCEPTED", isMandatory: true })
    const result = await attendeeAcceptAppointment("apt-1", "user-1")
    expect(result.attendee.status).toBe("ACCEPTED")
  })
})

describe("attendeeDeclineAppointment", () => {
  it("updates attendee status to DECLINED", async () => {
    mockAppointmentRepo.findById.mockResolvedValue(mockAppt())
    mockAppointmentRepo.updateAttendeeStatus.mockResolvedValue({ id: "att-1", appointmentId: "apt-1", userId: "user-1", status: "DECLINED", isMandatory: true })
    const result = await attendeeDeclineAppointment("apt-1", "user-1")
    expect(result.attendee.status).toBe("DECLINED")
  })
})
