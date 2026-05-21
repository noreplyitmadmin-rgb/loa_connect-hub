import { meetingRepository } from "@/lib/repositories/factory"
import { checkConflicts } from "@/lib/services/conflictDetection"

export async function createMeeting(data: {
  title: string
  description?: string
  date: string
  startTime: string
  endTime: string
  organizerId: string
  participantIds: string[]
}) {
  const meeting = await meetingRepository.create({
    title: data.title,
    description: data.description ?? null,
    date: data.date,
    startTime: data.startTime,
    endTime: data.endTime,
    organizerId: data.organizerId,
  })

  // Add all participants (including organizer as ACCEPTED)
  await meetingRepository.addParticipant(meeting.id, data.organizerId)
  await meetingRepository.updateParticipantStatus(meeting.id, data.organizerId, "ACCEPTED")

  for (const pid of data.participantIds) {
    if (pid !== data.organizerId) {
      await meetingRepository.addParticipant(meeting.id, pid)
    }
  }

  return meetingRepository.findById(meeting.id)
}

export async function getMeetingsForUser(userId: string) {
  const [organized, invited] = await Promise.all([
    meetingRepository.listByOrganizer(userId),
    meetingRepository.listByParticipant(userId),
  ])

  // Deduplicate by id
  const seen = new Set<string>()
  const all = [...organized, ...invited].filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  return all
}

export async function getMeetingById(id: string) {
  const meeting = await meetingRepository.findById(id)
  if (!meeting) throw new Error("Meeting not found")
  return meeting
}

export async function respondToMeeting(meetingId: string, userId: string, status: "ACCEPTED" | "DECLINED") {
  return meetingRepository.updateParticipantStatus(meetingId, userId, status)
}

export async function cancelMeeting(id: string, userId: string) {
  const meeting = await meetingRepository.findById(id)
  if (!meeting) throw new Error("Meeting not found")
  if (meeting.organizerId !== userId) throw new Error("Only the organizer can cancel the meeting")

  return meetingRepository.update(id, { status: "CANCELLED" })
}

export async function getConflicts(
  facultyIds: string[],
  date: string,
  startTime: string,
  endTime: string
) {
  return checkConflicts(facultyIds, date, startTime, endTime)
}
