import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { appointmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"

export async function POST(request: Request, { params }: { params: Promise<{ slotId: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const role = (session.user as any).role
  if (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN")) {
    return NextResponse.json({ error: "Only faculty can update meeting links" }, { status: 403 })
  }

  const { slotId } = await params

  try {
    const slot = await appointmentRepository.findTimeSlotById(slotId)
    if (!slot) {
      return NextResponse.json({ error: "Time slot not found" }, { status: 404 })
    }

    const { teamsLink } = await request.json()

    if (!teamsLink || typeof teamsLink !== "string") {
      return NextResponse.json({ error: "teamsLink is required" }, { status: 400 })
    }

    if (!/^https:\/\/teams\.microsoft\.com\/.*/.test(teamsLink.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid Microsoft Teams meeting URL (https://teams.microsoft.com/...)" },
        { status: 400 }
      )
    }

    await appointmentRepository.updateTimeSlot(slotId, { teamsLink: teamsLink.trim() })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update Teams link" },
      { status: 400 }
    )
  }
}
