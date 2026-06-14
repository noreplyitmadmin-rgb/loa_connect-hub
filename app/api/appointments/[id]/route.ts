import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getAppointmentDetail } from "@/features/appointments/appointments.controller"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const appointment = await getAppointmentDetail(id)
    return NextResponse.json({ appointment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch appointment" },
      { status: 404 }
    )
  }
}
