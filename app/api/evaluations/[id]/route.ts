import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getEvaluation } from "@/lib/controllers/evaluations"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const evaluation = await getEvaluation(id)
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ evaluation })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation" }, { status: 500 })
  }
}
