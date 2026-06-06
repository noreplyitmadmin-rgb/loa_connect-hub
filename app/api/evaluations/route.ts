import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getMyEvaluations } from "@/lib/controllers/evaluations"
import { getActiveSemester, createSemester } from "@/lib/controllers/semesters"
// import { evaluationPeriodRepository, evaluationRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const evaluations = await getMyEvaluations(userId)
    return NextResponse.json({ evaluations })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluations" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { periodId, evaluateeId } = await request.json()
    //TODO: replace with semester
    const activePeriod = periodId || (await getActiveSemester())?.id
    if (!activePeriod) {
      return NextResponse.json({ error: "No active evaluation period" }, { status: 400 })
    }
    const evaluation = await createSemester({
      title: `Evaluation for ${evaluateeId} by ${userId}`,
      evalStartDate: new Date().toISOString(),
      evalEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    })
    
    return NextResponse.json({ evaluation }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create evaluation" }, { status: 500 })
  }
}
