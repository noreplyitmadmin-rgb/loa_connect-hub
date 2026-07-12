import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { getEvaluationPeriod, updateEvaluationPeriod, deleteEvaluationPeriod } from "@/features/admin-data/evaluation-periods.service"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  try {
    const period = await getEvaluationPeriod(id)
    if (!period) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ period })
  } catch {
    return NextResponse.json({ error: "Failed to fetch evaluation period" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    const body = await request.json()
    const period = await updateEvaluationPeriod(id, body)
    return NextResponse.json({ period })
  } catch {
    return NextResponse.json({ error: "Failed to update evaluation period" }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  try {
    await deleteEvaluationPeriod(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "Failed to delete evaluation period" }, { status: 500 })
  }
}
