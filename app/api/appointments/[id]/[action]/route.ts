import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  acceptAppointment,
  completeAppointment,
  cancelAppointment,
  getAppointmentDetail,
} from "@/features/appointments/appointments.controller"
import {
  declineAppointment,
  updateTeamsLink,
  attendeeAcceptAppointment,
  attendeeDeclineAppointment,
} from "@/features/appointments/appointments.service"

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as Record<string, unknown>).id as string
  const userEmail = (session.user as Record<string, unknown>).email as string
  const { id, action } = await params

    try {
      let appointment
      let body: Record<string, unknown> = {}
      try { body = await request.json() } catch {}

      switch (action) {
        case "accept":
        case "approve":
          await acceptAppointment(id, userId)
          // Re-fetch enriched detail so per-slot Teams links, files, etc. are included
          appointment = await getAppointmentDetail(id)
          break
        case "decline":
        case "reject":
          appointment = await declineAppointment(id, userId)
          break
        case "complete":
          await completeAppointment(id, userId, body.actionTaken as string | undefined)
          appointment = await getAppointmentDetail(id)
          break
        case "cancel":
          appointment = await cancelAppointment(id, userId, userEmail)
          break
        case "teams-link":
          appointment = await updateTeamsLink(id, userId, body.teamsLink as string)
          break
      case "attendee-accept":
        return NextResponse.json(await attendeeAcceptAppointment(id, userId))
      case "attendee-decline":
        return NextResponse.json(await attendeeDeclineAppointment(id, userId))
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    return NextResponse.json({ appointment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Action failed" },
      { status: 400 }
    )
  }
}
