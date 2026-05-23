import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requestAppointment } from "@/lib/controllers/appointments"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as any).role
  if (role !== "STUDENT" && role !== "FACULTY" && role !== "DEAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { facultyIds, date, startTime, endTime, timeSlots, title, description, attendeeOptions, meetingType } = body
  const studentId = (session.user as any).id

  if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
    return NextResponse.json({ error: "facultyIds must be a non-empty array" }, { status: 400 })
  }

  if (!Array.isArray(timeSlots) && (!date || !startTime || !endTime)) {
    return NextResponse.json({ error: "A time slot or timeSlots array is required" }, { status: 400 })
  }

  const sessionGroupId = crypto.randomUUID()
  const results: { facultyId: string; appointment: any }[] = []
  const errors: { facultyId: string; error: string }[] = []

  for (const facultyId of facultyIds) {
    try {
      // For each faculty, create an appointment with the other faculty as attendees
      const otherFacultyOptions = facultyIds
        .filter((id: string) => id !== facultyId)
        .map((id: string) => {
          const opt = attendeeOptions?.find((o: any) => o.userId === id)
          return {
            userId: id,
            isMandatory: opt?.isMandatory ?? true,
          }
        })

      const appointment = await requestAppointment({
        studentId,
        facultyId,
        sessionGroupId,
        date,
        startTime,
        endTime,
        timeSlots,
        title,
        description,
        attendeeOptions: otherFacultyOptions,
        meetingType,
      })
      results.push({ facultyId, appointment: appointment as any })
    } catch (err) {
      errors.push({ facultyId, error: err instanceof Error ? err.message : "Unknown error" })
    }
  }

  return NextResponse.json({ results, errors, sessionGroupId })
}
