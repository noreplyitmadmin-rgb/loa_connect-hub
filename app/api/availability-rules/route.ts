import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listAvailabilityRules, upsertAvailabilityRule } from "@/lib/controllers/availabilityRules"

export async function GET() {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "FACULTY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session.user as any).id
  const rules = await listAvailabilityRules(facultyId)
  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as any).role !== "FACULTY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session.user as any).id
  const body = await request.json()

  const { dayOfWeek, isBlocked, startTime, endTime } = body

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "Invalid dayOfWeek (0-6)" }, { status: 400 })
  }

  const rule = await upsertAvailabilityRule({
    facultyId,
    dayOfWeek,
    isBlocked: !!isBlocked,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
  })

  return NextResponse.json({ rule })
}
