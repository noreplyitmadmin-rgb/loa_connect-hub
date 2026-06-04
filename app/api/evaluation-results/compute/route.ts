import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { computeEvaluationResults } from "@/lib/controllers/evaluation-results"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { periodId, facultyId } = await request.json()
    await computeEvaluationResults(periodId, facultyId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to compute results" }, { status: 500 })
  }
}
