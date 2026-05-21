import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { respondToMeeting } from "@/lib/controllers/meetings"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = (session.user as any).id
  const { id } = await params
  const body = await request.json()

  const status = body.status as "ACCEPTED" | "DECLINED"
  if (!["ACCEPTED", "DECLINED"].includes(status)) {
    return NextResponse.json({ error: "Status must be ACCEPTED or DECLINED" }, { status: 400 })
  }

  try {
    const participant = await respondToMeeting(id, userId, status)
    return NextResponse.json({ participant })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to respond" },
      { status: 400 }
    )
  }
}
