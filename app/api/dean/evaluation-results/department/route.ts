import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { departmentRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  const userId = (session.user as Record<string, unknown>).id as string
  const dept = await departmentRepository.findByDeanId(userId)
  if (!dept) return NextResponse.json({ departmentId: null })
  return NextResponse.json({ departmentId: dept.id })
}
