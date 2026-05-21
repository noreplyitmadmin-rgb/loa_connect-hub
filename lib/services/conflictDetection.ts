import { meetingRepository } from "@/lib/repositories/factory"
import type { AppointmentData, MeetingData } from "@/lib/repositories/interfaces"

export interface Conflict {
  type: "appointment" | "meeting"
  userId: string
  userName: string
  date: string
  startTime: string
  endTime: string
  title: string
}

export async function checkConflicts(
  facultyIds: string[],
  date: string,
  startTime: string,
  endTime: string
): Promise<Conflict[]> {
  const conflicts: Conflict[] = []

  for (const userId of facultyIds) {
    // Check existing appointments (PENDING or APPROVED) on the same date/time
    const appointments = await meetingRepository.listConflictingAppointments(userId, date, startTime, endTime)
    for (const apt of appointments as any[]) {
      conflicts.push({
        type: "appointment",
        userId,
        userName: apt.student?.name || apt.faculty?.name || "Unknown",
        date,
        startTime: apt.schedule?.startTime || startTime,
        endTime: apt.schedule?.endTime || endTime,
        title: `Appointment with ${apt.student?.name || apt.faculty?.name || "Unknown"}`,
      })
    }

    // Check existing internal meetings (CONFIRMED)
    const meetings = await meetingRepository.listConflictingMeetings(userId, date, startTime, endTime)
    for (const mtg of meetings as any[]) {
      conflicts.push({
        type: "meeting",
        userId,
        userName: mtg.organizer?.name || "Unknown",
        date,
        startTime: mtg.startTime,
        endTime: mtg.endTime,
        title: mtg.title,
      })
    }
  }

  return conflicts
}
