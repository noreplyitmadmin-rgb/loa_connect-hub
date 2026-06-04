import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { submitEvaluation } from "@/lib/controllers/evaluations"

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const evaluation = await submitEvaluation(id)
    return NextResponse.json({ evaluation })
  } catch {
    return NextResponse.json({ error: "Failed to submit evaluation" }, { status: 500 })
  }
}
