import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { addEvaluationComment } from "@/lib/controllers/evaluations"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "STUDENT")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const { comment } = await request.json()
    const created = await addEvaluationComment(id, comment)
    return NextResponse.json({ comment: created }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to add comment" }, { status: 500 })
  }
}
