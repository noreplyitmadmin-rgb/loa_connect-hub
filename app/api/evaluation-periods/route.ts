import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getEvaluationPeriods, createEvaluationPeriod } from "@/features/admin-data/evaluation-periods.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId") || undefined
    const periods = await getEvaluationPeriods(semesterId ? { semesterId } : undefined)
    return NextResponse.json({ periods })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation periods" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const period = await createEvaluationPeriod(body)
    return NextResponse.json({ period }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation period" }, { status: 500 })
  }
}
