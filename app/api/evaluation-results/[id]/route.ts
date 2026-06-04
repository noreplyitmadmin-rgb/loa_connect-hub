import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFacultyEvaluationResult } from "@/lib/controllers/evaluation-results"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { id } = await params
    const result = await getFacultyEvaluationResult(id, (session.user as Record<string, unknown>).id as string)
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ result })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation result" }, { status: 500 })
  }
}
