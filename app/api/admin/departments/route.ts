import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { departmentRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"
import { logAuditEvent } from "@/lib/services/audit"

export async function GET() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const departments = await departmentRepository.listAll()
    return NextResponse.json(departments)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized — Admin only" }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { name, code, deanId } = body

    if (!name || !code) {
      return NextResponse.json({ error: "Name and Code are required" }, { status: 400 })
    }

    const created = await departmentRepository.create({
      name,
      code: code.toUpperCase(),
      deanId: deanId || null,
    })

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_DEPARTMENT",
      details: `Created department ${created.name} (${created.code})`,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (err: unknown) {
    const pgErr = err as Record<string, unknown>
    if (pgErr.code === "23505") {
      return NextResponse.json({ error: "Department code already exists" }, { status: 409 })
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
