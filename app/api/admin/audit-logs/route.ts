import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { auditLogRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"

export async function GET(req: Request) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get("page")) || 1
  const pageSize = 25
  const offset = Math.max(0, (page - 1) * pageSize)

  const logs = await auditLogRepository.list(pageSize, offset)
  return NextResponse.json({ logs })
}
