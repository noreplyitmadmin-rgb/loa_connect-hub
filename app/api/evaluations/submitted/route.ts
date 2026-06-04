import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getMyEvaluations } from "@/lib/controllers/evaluations"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  const userId = (session.user as Record<string, unknown>).id as string

  if (!hasRole(role, "STUDENT"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const evaluations = await getMyEvaluations(userId)
    return NextResponse.json({ evaluations })
  } catch {
    return NextResponse.json({ error: "Failed to fetch submitted evaluations" }, { status: 500 })
  }
}
