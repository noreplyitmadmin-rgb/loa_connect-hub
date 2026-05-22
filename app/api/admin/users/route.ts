import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"
import { logAuditEvent } from "@/lib/services/audit"

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (role !== "ADMIN" && role !== "DEAN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (role === "ADMIN") {
    const users = await userRepository.listAll()
    return NextResponse.json({ users })
  }

  // Dean: only see faculty in their department
  const dept = await departmentRepository.findByDeanId((session!.user as any).id)
  if (!dept) return NextResponse.json({ users: [] })

  const deptFaculty = await userRepository.listByDepartment(dept.id)
  const facultyOnly = deptFaculty.filter((u) => u.role === "FACULTY" || u.role === "DEAN")
  return NextResponse.json({ users: facultyOnly })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (role !== "ADMIN" && role !== "DEAN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, isDisabled } = body
  const currentUserId = (session!.user as any).id

  const target = await userRepository.findById(userId)
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Admin cannot disable themselves
  if (role === "ADMIN" && target.id === currentUserId && isDisabled) {
    return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 })
  }

  // Cannot disable the last active Admin
  if (target.role === "ADMIN" && isDisabled) {
    const allAdmins = await userRepository.listByRole("ADMIN")
    const activeAdmins = allAdmins.filter((a: any) => !a.isDisabled)
    if (activeAdmins.length <= 1 && activeAdmins[0]?.id === target.id) {
      return NextResponse.json({ error: "Cannot disable the only active admin" }, { status: 400 })
    }
  }

  if (role === "DEAN") {
    const dept = await departmentRepository.findByDeanId((session!.user as any).id)
    if (!dept || (target.departmentId !== dept.id && target.id !== currentUserId)) {
      return NextResponse.json({ error: "Cannot manage users outside your department" }, { status: 403 })
    }
    if (target.role === "STUDENT") {
      return NextResponse.json({ error: "Deans can only manage faculty members" }, { status: 403 })
    }
  }

  const user = await userRepository.update(userId, { isDisabled: !!isDisabled })
  await logAuditEvent({
    userId: currentUserId,
    action: isDisabled ? "DISABLE_USER" : "ENABLE_USER",
    details: `${isDisabled ? "Disabled" : "Enabled"} user ${target.name} (${target.email})`,
  })
  return NextResponse.json({ user })
}
