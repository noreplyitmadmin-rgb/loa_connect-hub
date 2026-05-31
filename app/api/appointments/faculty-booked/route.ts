import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFacultyBookedAppointments } from "@/lib/controllers/appointments"
import { hasRole } from "@/lib/utils/roles"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Only students can check faculty availability" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const facultyId = searchParams.get("facultyId")
  const startDate = searchParams.get("startDate")
  const endDate = searchParams.get("endDate")

  if (!facultyId || !startDate || !endDate) {
    return NextResponse.json(
      { error: "facultyId, startDate, and endDate are required" },
      { status: 400 }
    )
  }

  try {
    const appointments = await getFacultyBookedAppointments(facultyId, startDate, endDate)
    // Return only lightweight data needed for the calendar
    const slots = appointments.map((a) => ({
      date: a.date,
      startTime: a.startTime,
      endTime: a.endTime,
    }))
    return NextResponse.json({ appointments: slots })
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch faculty booked appointments" },
      { status: 500 }
    )
  }
}
