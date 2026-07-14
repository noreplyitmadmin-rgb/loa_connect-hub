import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { evaluationRepository } from "@/lib/repositories/factory"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const evaluationPeriodId = searchParams.get("evaluationPeriodId") || searchParams.get("semesterId")
  const sentimentLabel = searchParams.get("sentimentLabel")

  try {
    const comments = await evaluationRepository.listCommentsWithFilters({
      evaluationPeriodId: evaluationPeriodId || undefined,
      sentimentLabel: sentimentLabel || undefined,
    })
    return NextResponse.json({ comments })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
