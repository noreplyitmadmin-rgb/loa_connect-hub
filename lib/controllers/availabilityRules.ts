import { availabilityRuleRepository } from "@/lib/repositories/factory"
import type { UpsertAvailabilityRuleInput } from "@/lib/repositories/interfaces"

export async function listAvailabilityRules(facultyId: string) {
  return availabilityRuleRepository.listByFaculty(facultyId)
}

export async function upsertAvailabilityRule(input: UpsertAvailabilityRuleInput) {
  return availabilityRuleRepository.upsert(input)
}

export async function deleteAvailabilityRule(id: string) {
  await availabilityRuleRepository.delete(id)
}

/**
 * Get the effective available hours for a faculty on a given day of week.
 * Returns null if the day is blocked, or { startTime, endTime } if available.
 * If no rule exists, defaults to available all day (null).
 */
export async function getEffectiveHours(facultyId: string, dayOfWeek: number) {
  const rule = await availabilityRuleRepository.findByFacultyAndDay(facultyId, dayOfWeek)

  if (!rule) {
    // No rule = fully available
    return { isBlocked: false, startTime: null, endTime: null }
  }

  if (rule.isBlocked) {
    return { isBlocked: true, startTime: null, endTime: null }
  }

  return { isBlocked: false, startTime: rule.startTime, endTime: rule.endTime }
}

/**
 * Check if a given time slot falls within a faculty's availability rules.
 */
export async function isSlotAllowed(
  facultyId: string,
  date: string,
  startTime: string,
  endTime: string
): Promise<boolean> {
  const dayOfWeek = new Date(date).getDay()
  // Convert Sunday=0 to Monday=0, ..., Sunday=6
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const effective = await getEffectiveHours(facultyId, adjustedDay)

  if (effective.isBlocked) return false

  // If no time window restriction, allow
  if (!effective.startTime || !effective.endTime) return true

  // Check if the slot falls within the allowed window
  return startTime >= effective.startTime && endTime <= effective.endTime
}
