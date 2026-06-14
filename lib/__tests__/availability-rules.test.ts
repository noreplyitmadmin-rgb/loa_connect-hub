import { describe, it, expect, vi } from "vitest"
import type { AvailabilityRuleData } from "@/lib/types"

const mockAvailabilityRepo = vi.hoisted(() => ({
  listByFaculty: vi.fn(),
  upsert: vi.fn(),
  delete: vi.fn(),
}))

vi.mock("@/lib/repositories/factory", () => ({
  availabilityRuleRepository: mockAvailabilityRepo,
}))

import { findActiveRule, getEffectiveHours, isSlotAllowed } from "@/features/appointments/availability.service"

function makeRule(overrides: Partial<AvailabilityRuleData> = {}): AvailabilityRuleData {
  return {
    id: "rule-1",
    facultyId: "faculty-1",
    dayOfWeek: 0,
    isBlocked: false,
    startTime: "09:00",
    endTime: "17:00",
    startDate: "2026-01-01",
    endDate: null,
    ...overrides,
  }
}

describe("findActiveRule", () => {
  it("returns matching rule for given date", async () => {
    const rule = makeRule({ dayOfWeek: 0 })
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([rule])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result).toBeDefined()
    expect(result!.id).toBe("rule-1")
  })

  it("returns null when no rule matches day of week", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ dayOfWeek: 1 })])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result).toBeNull()
  })

  it("returns null when date is before startDate", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ startDate: "2026-07-01" })])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result).toBeNull()
  })

  it("returns null when date is after endDate", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ endDate: "2026-06-01" })])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result).toBeNull()
  })

  it("handles Sunday correctly (converts to dayOfWeek 6)", async () => {
    const rule = makeRule({ dayOfWeek: 6 })
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([rule])
    const result = await findActiveRule("faculty-1", "2026-06-14")
    expect(result).toBeDefined()
  })

  it("returns latest startDate when multiple rules match", async () => {
    const older = makeRule({ id: "rule-old", startDate: "2026-01-01", dayOfWeek: 0 })
    const newer = makeRule({ id: "rule-new", startDate: "2026-06-01", dayOfWeek: 0 })
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([older, newer])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result!.id).toBe("rule-new")
  })

  it("returns null when listByFaculty returns empty", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([])
    const result = await findActiveRule("faculty-1", "2026-06-15")
    expect(result).toBeNull()
  })
})

describe("getEffectiveHours", () => {
  it("returns blocked when no active rule", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([])
    const result = await getEffectiveHours("faculty-1", "2026-06-15")
    expect(result.isBlocked).toBe(true)
    expect(result.startTime).toBeNull()
  })

  it("returns blocked when rule.isBlocked is true", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ isBlocked: true })])
    const result = await getEffectiveHours("faculty-1", "2026-06-15")
    expect(result.isBlocked).toBe(true)
  })

  it("returns available hours when rule is not blocked", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ isBlocked: false, startTime: "09:00", endTime: "17:00" })])
    const result = await getEffectiveHours("faculty-1", "2026-06-15")
    expect(result.isBlocked).toBe(false)
    expect(result.startTime).toBe("09:00")
    expect(result.endTime).toBe("17:00")
  })
})

describe("isSlotAllowed", () => {
  it("returns true when slot falls within available window", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ startTime: "09:00", endTime: "17:00" })])
    const result = await isSlotAllowed("faculty-1", "2026-06-15", "10:00", "11:00")
    expect(result).toBe(true)
  })

  it("returns false when faculty is blocked", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ isBlocked: true })])
    const result = await isSlotAllowed("faculty-1", "2026-06-15", "10:00", "11:00")
    expect(result).toBe(false)
  })

  it("returns false when slot starts before allowed window", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ startTime: "09:00", endTime: "17:00" })])
    const result = await isSlotAllowed("faculty-1", "2026-06-15", "08:00", "10:00")
    expect(result).toBe(false)
  })

  it("returns false when slot ends after allowed window", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ startTime: "09:00", endTime: "17:00" })])
    const result = await isSlotAllowed("faculty-1", "2026-06-15", "16:00", "18:00")
    expect(result).toBe(false)
  })

  it("returns true when no time window restriction (null startTime/endTime)", async () => {
    mockAvailabilityRepo.listByFaculty.mockResolvedValue([makeRule({ startTime: null, endTime: null })])
    const result = await isSlotAllowed("faculty-1", "2026-06-15", "08:00", "09:00")
    expect(result).toBe(true)
  })
})
