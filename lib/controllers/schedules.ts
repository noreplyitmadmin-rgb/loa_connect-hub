import { scheduleRepository, availabilityRuleRepository } from "@/lib/repositories/factory"

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export async function createSchedule(input: {
  facultyId: string
  date: string
  startTime: string
  endTime: string
}) {
  const schedule = await scheduleRepository.create(input)
  return schedule
}

export async function listAvailableSchedules() {
  const schedules = await scheduleRepository.listAvailable()

  // Filter by faculty availability rules
  const filtered: any[] = []
  const ruleCache = new Map<string, any[]>()

  for (const schedule of schedules as any[]) {
    const facultyId = schedule.facultyId
    const date = schedule.date
    const startTime = schedule.startTime
    const endTime = schedule.endTime

    // Get or cache rules for this faculty
    if (!ruleCache.has(facultyId)) {
      const rules = await availabilityRuleRepository.listByFaculty(facultyId)
      ruleCache.set(facultyId, rules)
    }

    const rules = ruleCache.get(facultyId)!

    // Determine day of week from date string (YYYY-MM-DD)
    const dayOfWeek = new Date(date + "T00:00:00").getDay()
    // Convert: Sunday=0 → 6, Monday=1 → 0, ..., Saturday=6 → 5
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1

    const dayRule = rules.find((r) => r.dayOfWeek === adjustedDay)

    if (!dayRule) {
      // No rule configured — allow
      filtered.push(schedule)
    } else if (dayRule.isBlocked) {
      // Day is blocked — skip
      continue
    } else if (dayRule.startTime && dayRule.endTime) {
      // Day has time window — check if slot fits
      if (startTime >= dayRule.startTime && endTime <= dayRule.endTime) {
        filtered.push(schedule)
      }
    } else {
      // Day is not blocked and has no time restriction — allow
      filtered.push(schedule)
    }
  }

  return filtered
}

export async function listFacultySchedules(facultyId: string) {
  return scheduleRepository.listByFaculty(facultyId)
}

export async function updateSchedule(id: string, data: { date?: string; startTime?: string; endTime?: string; isAvailable?: boolean }) {
  return scheduleRepository.update(id, data)
}

export async function deleteSchedule(id: string) {
  await scheduleRepository.delete(id)
}
