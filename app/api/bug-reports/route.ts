import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { bugReportRepository } from "@/lib/repositories/factory"
import { requireAdmin } from "@/lib/route-guard"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { url, description } = body as { url?: string; description?: string }

  if (!url || !description) {
    return NextResponse.json({ error: "URL and description are required" }, { status: 400 })
  }

  const userId = (session.user as Record<string, unknown>).id as string
  const userEmail = session.user.email ?? ""

  const report = await bugReportRepository.create({ userId, userEmail, url, description })
  return NextResponse.json({ report }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const authErr = await requireAdmin(req)
  if (authErr) return authErr

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page")) || 1
  const pageSize = Number(searchParams.get("pageSize")) || 50
  const offset = Math.max(0, (page - 1) * pageSize)
  const status = searchParams.get("status") || undefined

  const { reports, total } = await bugReportRepository.list(pageSize, offset, { status })
  return NextResponse.json({ reports, total, page, pageSize })
}
