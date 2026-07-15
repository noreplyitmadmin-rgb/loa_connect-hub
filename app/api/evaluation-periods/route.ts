import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getEvaluationPeriods, createEvaluationPeriod } from "@/features/admin-data/evaluation-periods.service"
import { supabase } from "@/lib/db"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const semesterId = searchParams.get("semesterId") || undefined
    const periods = await getEvaluationPeriods(semesterId ? { semesterId } : undefined)

    const periodIds = periods.map((p) => p.id)
    const { data: evalRows } = periodIds.length > 0
      ? await supabase.from("evaluations").select("evaluation_period_id").in("evaluation_period_id", periodIds)
      : { data: [] as { evaluation_period_id: string }[] }

    const countMap = new Map<string, number>()
    for (const row of evalRows ?? []) {
      countMap.set(row.evaluation_period_id, (countMap.get(row.evaluation_period_id) ?? 0) + 1)
    }

    const periodsWithCounts = periods.map((p) => ({ ...p, evaluationCount: countMap.get(p.id) ?? 0 }))
    return NextResponse.json({ periods: periodsWithCounts })
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
