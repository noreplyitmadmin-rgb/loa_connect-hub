import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { auditLogRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const logs = await auditLogRepository.list(100)
  return NextResponse.json({ logs })
}
