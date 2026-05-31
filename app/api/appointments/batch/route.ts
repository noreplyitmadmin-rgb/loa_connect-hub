import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requestAppointment } from "@/lib/controllers/appointments"
import { hasRole } from "@/lib/utils/roles"

export async function POST(request: NextRequest) {
  const session = await auth()

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as Record<string, unknown>).role as string
  const currentUserId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT") && !hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const {
    facultyIds,
    studentId: bodyStudentId,
    date,
    startTime,
    endTime,
    timeSlots,
    title,
    description,
    attendeeOptions,
    teamsLink,
    slotLinks,
    meetingType
  } = body


  if (!Array.isArray(facultyIds) || facultyIds.length === 0) {
    return NextResponse.json({ error: "facultyIds must be a non-empty array" }, { status: 400 })
  }

  if (!Array.isArray(timeSlots) && (!date || !startTime || !endTime)) {
    return NextResponse.json({ error: "A time slot or timeSlots array is required" }, { status: 400 })
  }

  // ✅ FIX: determine student correctly
  let studentId: string = ""

  if (hasRole(role, "STUDENT")) {
    // Creator is student → NOT stored as studentId
    studentId = "";
  } else {
    // Faculty/Dean may include a student
    studentId = bodyStudentId ?? null
  }

  // ✅ RULE: studentId must not equal creator
  if (studentId && studentId === currentUserId) {
    return NextResponse.json(
      { error: "Creator cannot be the student participant" },
      { status: 400 }
    )
  }

  // Primary faculty
  const primaryFacultyId = facultyIds[0]

  // Additional faculty attendees
  const additionalFacultyAttendees = facultyIds
    .filter((id: string) => id !== primaryFacultyId)
    .map((id: string) => {
      const opt = attendeeOptions?.find((o: Record<string, unknown>) => o.userId === id)
      return {
        userId: id,
        isMandatory: opt?.isMandatory ?? true,
      }
    })

  // Combine attendees
  const allAttendees = [
    ...additionalFacultyAttendees,
    ...(attendeeOptions || []).filter((o: Record<string, unknown>) => !facultyIds.includes(o.userId as string))
  ]

  const sessionGroupId = crypto.randomUUID()

  try {
    const result = await requestAppointment({
      createdByUserId: currentUserId,
      studentId: studentId === "" ? null : studentId,
      facultyId: primaryFacultyId,
      sessionGroupId,
      date,
      startTime,
      endTime,
      timeSlots,
      title,
      description,
      attendeeOptions: allAttendees,
      teamsLink,
      slotLinks,
      meetingType,
    })

    return NextResponse.json({ appointment: result.appointment, sessionGroupId, conflicts: result.conflicts }, { status: 201 })
    
  } catch (err: unknown) {
    console.error("--- APPOINTMENT CREATION FAILED ---");
    console.error(err); 
    console.error("-----------------------------------");

    const errObj = err as Record<string, unknown>
    const body: Record<string, unknown> = { error: errObj.message || "Failed to create appointment" }
    if (errObj.conflicts) body.conflicts = errObj.conflicts
    return NextResponse.json(body, { status: 400 })
  }
}