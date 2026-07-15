import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userRepository, userPermissionRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const su = session.user as Record<string, unknown>
  const userId = su.id as string

  const user = await userRepository.findById(userId)
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const perms = await userPermissionRepository.findByUserIdLight(userId)

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, departmentId: user.departmentId, isDisabled: user.isDisabled, role: user.role },
    permissions: perms ?? [],
  })
}
