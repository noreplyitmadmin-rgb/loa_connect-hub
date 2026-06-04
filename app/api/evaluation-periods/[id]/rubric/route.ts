import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getRubric, replaceRubric } from "@/lib/controllers/rubrics"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const rubric = await getRubric(id)
    return NextResponse.json({ rubric })
  } catch {
    return NextResponse.json({ error: "Failed to fetch rubric" }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const rubric = await replaceRubric(id, body.categories)
    return NextResponse.json({ rubric }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to save rubric" }, { status: 500 })
  }
}
