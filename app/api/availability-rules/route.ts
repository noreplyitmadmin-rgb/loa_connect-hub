import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { listAvailabilityRules, upsertAvailabilityRule } from "@/lib/controllers/availabilityRules"
import { hasRole } from "@/lib/utils/roles"

export async function GET() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session!.user as Record<string, unknown>).id as string
  const rules = await listAvailabilityRules(facultyId)
  return NextResponse.json({ rules })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const facultyId = (session!.user as Record<string, unknown>).id as string
  const body = await request.json()

  const { dayOfWeek, isBlocked, startTime, endTime, startDate, endDate } = body

  if (typeof dayOfWeek !== "number" || dayOfWeek < 0 || dayOfWeek > 6) {
    return NextResponse.json({ error: "Invalid dayOfWeek (0-6)" }, { status: 400 })
  }

  if (typeof startDate !== "string" || !startDate) {
    return NextResponse.json({ error: "startDate is required (YYYY-MM-DD)" }, { status: 400 })
  }

  const rule = await upsertAvailabilityRule({
    facultyId,
    dayOfWeek,
    isBlocked: !!isBlocked,
    startTime: startTime ?? null,
    endTime: endTime ?? null,
    startDate,
    endDate: endDate ?? null,
  })

  return NextResponse.json({ rule })
}
