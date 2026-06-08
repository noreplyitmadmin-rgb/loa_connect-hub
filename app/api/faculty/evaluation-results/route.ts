import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const userId = (session.user as Record<string, unknown>).id as string
    if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const result = await evaluationResultRepository.findByFaculty(periodId, userId)
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation result" }, { status: 500 })
  }
}
