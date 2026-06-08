import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { evaluationResultRepository } from "@/lib/repositories/factory"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const departmentId = searchParams.get("departmentId")
    if (!periodId) return NextResponse.json({ error: "periodId is required" }, { status: 400 })

    const filters: { departmentId?: string } = {}
    if (departmentId) filters.departmentId = departmentId

    const results = await evaluationResultRepository.list(periodId, filters)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation results" }, { status: 500 })
  }
}
