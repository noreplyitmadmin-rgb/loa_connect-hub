import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { activateEvaluationPeriod } from "@/lib/controllers/evaluation-periods"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const period = await activateEvaluationPeriod(id)
    return NextResponse.json({ period })
  } catch {
    return NextResponse.json({ error: "Failed to activate evaluation period" }, { status: 500 })
  }
}
