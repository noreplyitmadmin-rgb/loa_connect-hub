import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getMeetingById, cancelMeeting } from "@/lib/controllers/meetings"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params

  try {
    const meeting = await getMeetingById(id)
    return NextResponse.json({ meeting })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Meeting not found" },
      { status: 404 }
    )
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const { id } = await params

  try {
    const meeting = await cancelMeeting(id, userId)
    return NextResponse.json({ meeting })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update meeting" },
      { status: 400 }
    )
  }
}
