import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { copyRubricFromPeriod } from "@/lib/controllers/rubrics"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const { sourcePeriodId } = await request.json()
    const rubric = await copyRubricFromPeriod(id, sourcePeriodId)
    return NextResponse.json({ rubric }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to copy rubric" }, { status: 500 })
  }
}
