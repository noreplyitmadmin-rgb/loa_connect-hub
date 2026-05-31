import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { listDeletedUsers } from "@/lib/controllers/admin-users"

export async function GET() {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const users = await listDeletedUsers()
    return NextResponse.json({ users })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
