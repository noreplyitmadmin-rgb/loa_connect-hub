import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  acceptAppointment,
  declineAppointment,
  completeAppointment,
  cancelAppointment,
  updateTeamsLink,
} from "@/lib/controllers/appointments"

export async function POST(request: Request, { params }: { params: Promise<{ id: string; action: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const userEmail = (session.user as any).email
  const { id, action } = await params

  try {
    let appointment

    switch (action) {
      case "accept":
      case "approve":
        appointment = await acceptAppointment(id, userId)
        break
      case "decline":
      case "reject":
        appointment = await declineAppointment(id, userId)
        break
      case "complete":
        appointment = await completeAppointment(id, userId)
        break
      case "cancel":
        appointment = await cancelAppointment(id, userId, userEmail)
        break
      case "teams-link":
        const { teamsLink } = await request.json()
        appointment = await updateTeamsLink(id, userId, teamsLink)
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
