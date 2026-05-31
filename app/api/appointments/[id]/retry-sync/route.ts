import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { retryTeamsSync } from "@/lib/controllers/appointments"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session.user as Record<string, unknown>).id as string
  const { id } = await params

  try {
    const appointment = await retryTeamsSync(id, facultyId)
    return NextResponse.json({ appointment })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Retry failed" },
      { status: 400 }
    )
  }
}
