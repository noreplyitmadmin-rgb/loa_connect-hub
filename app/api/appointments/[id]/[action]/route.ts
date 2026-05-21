import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  approveAppointment,
  rejectAppointment,
  completeAppointment,
  cancelAppointment,
  updateTeamsLink,
} from "@/lib/controllers/appointments"
import { createTeamsMeetingForAppointment } from "@/lib/controllers/teamsMeeting"
import { appointmentRepository } from "@/lib/repositories/factory"

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session.user as any).id
  const { id, action } = await params

  try {
    let appointment

    switch (action) {
      case "approve":
        appointment = await approveAppointment(id, facultyId)
        if (process.env.FEATURE_CREATE_TEAMS_MEETING === "true") {
          const accessToken = (session as any).accessToken
          if (accessToken) {
            try {
              await createTeamsMeetingForAppointment(id, facultyId, accessToken)
              appointment = await appointmentRepository.findById(id)
            } catch (e) {
              console.error("Failed to create Teams meeting:", e)
            }
          }
        }
        break
      case "reject":
        appointment = await rejectAppointment(id, facultyId)
        break
      case "complete":
        appointment = await completeAppointment(id, facultyId)
        break
      case "cancel":
        appointment = await cancelAppointment(id, facultyId)
        break
      case "teams-link":
        const { teamsLink } = await request.json()
        appointment = await updateTeamsLink(id, facultyId, teamsLink)
        break
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
