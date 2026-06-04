import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { recomputeAllResults } from "@/lib/controllers/evaluation-results"

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  try {
    const { periodId } = await request.json()
    await recomputeAllResults(periodId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to recompute results" }, { status: 500 })
  }
}
