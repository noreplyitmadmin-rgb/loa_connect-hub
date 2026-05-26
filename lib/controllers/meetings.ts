import { meetingRepository } from "@/lib/repositories/factory"

export async function getMeetingsForUser(userId: string) {
  const [organized, invited] = await Promise.all([
    meetingRepository.listByOrganizer(userId),
    meetingRepository.listByParticipant(userId),
  ])

  const seen = new Set<string>()
  const all = [...organized, ...invited].filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })

  return all
}
