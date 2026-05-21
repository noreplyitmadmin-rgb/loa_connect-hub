import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getConflicts } from "@/lib/controllers/meetings"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()

  try {
    const conflicts = await getConflicts(
      body.facultyIds || [],
      body.date,
      body.startTime,
      body.endTime
    )
    return NextResponse.json({ conflicts })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to check conflicts" },
      { status: 400 }
    )
  }
}
