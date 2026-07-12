import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { rubricRepository } from "@/lib/repositories/factory"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const { sourcePeriodId } = body
    if (!sourcePeriodId) {
      return NextResponse.json({ error: "sourcePeriodId is required" }, { status: 400 })
    }
    const rubric = await rubricRepository.copyFromSource(id, sourcePeriodId)
    return NextResponse.json({ rubric }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to copy rubric" }, { status: 500 })
  }
}
