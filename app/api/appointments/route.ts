import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { requestAppointment, listStudentAppointments, listFacultyAppointments } from "@/lib/controllers/appointments"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q")?.toLowerCase().trim() || ""
    
    const role = (session.user as any).role
    const userId = (session.user as any).id
    let appointments = role === "FACULTY"
      ? await listFacultyAppointments(userId)
      : await listStudentAppointments(userId)
    
    // Filter by search query if provided
    if (q) {
      appointments = appointments.filter((appt: any) => {
        const title = appt.title?.toLowerCase() || ""
        const studentName = appt.studentName?.toLowerCase() || ""
        const facultyName = appt.facultyName?.toLowerCase() || ""
        return title.includes(q) || studentName.includes(q) || facultyName.includes(q)
      })
    }
    
    return NextResponse.json({ appointments })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = session.user as any
  const body = await request.json()

  const role = (session.user as any).role
  if (role !== "STUDENT" && role !== "FACULTY" && role !== "DEAN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // 1. Determine studentId dynamically based on the CREATOR'S role
  // If the creator is a STUDENT, the studentId is their own ID.
  // If the creator is FACULTY/DEAN, they might be booking on behalf of a student 
  // (via body.studentId) or creating an internal meeting (studentId = null).
  let studentId: string | null = null
  if (user.role === "STUDENT") {
    studentId = user.id
  } else {
    studentId = body.studentId || null 
  }

  try {
    const body = await request.json()
    const appointment = await requestAppointment({
      createdByUserId: (session.user as any).id,
      studentId: studentId,
      facultyId: body.facultyId,
      sessionGroupId: body.sessionGroupId,
      date: body.date,
      startTime: body.startTime,
      endTime: body.endTime,
      timeSlots: body.timeSlots,
      title: body.title,
      description: body.description,
      attendeeIds: body.attendeeIds,
      meetingType: body.meetingType,
    })
    return NextResponse.json({ appointment }, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create appointment" },
      { status: 400 }
    )
  }
}
