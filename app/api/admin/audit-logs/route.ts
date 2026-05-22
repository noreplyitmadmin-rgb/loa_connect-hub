import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { auditLogRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const logs = await auditLogRepository.list(100)
  return NextResponse.json({ logs })
}
