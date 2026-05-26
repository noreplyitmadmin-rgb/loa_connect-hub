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

  const departments = await departmentRepository.listAll()

  if (role === "ADMIN") {
    const users = await userRepository.listAll()
    return NextResponse.json({ users, departments })
  }

  // Dean: only see faculty in their department
  const dept = await departmentRepository.findByDeanId((session!.user as any).id)
  if (!dept) return NextResponse.json({ users: [], departments })

  const deptFaculty = await userRepository.listByDepartment(dept.id)
  const facultyOnly = deptFaculty.filter((u) => u.role === "FACULTY" || u.role === "DEAN")
  return NextResponse.json({ users: facultyOnly, departments })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (role !== "ADMIN" && role !== "DEAN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, isDisabled, role: newRole } = body
  const currentUserId = (session!.user as any).id
  const VALID_ROLES = ["STUDENT", "FACULTY", "DEAN", "ADMIN", "GUEST"]

  const target = await userRepository.findById(userId)
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Only ADMIN can change roles (not DEAN)
  if (newRole !== undefined) {
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "Only admins can change user roles" }, { status: 403 })
    }
    if (!VALID_ROLES.includes(newRole)) {
      return NextResponse.json({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }, { status: 400 })
    }
    // Admin cannot change their own role
    if (target.id === currentUserId) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
    }
  }

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

  // Build update payload
  const updateData: Record<string, any> = {}
  const auditActions: string[] = []

  if (newRole !== undefined) {
    updateData.role = newRole
    auditActions.push(`changed role from ${target.role} to ${newRole}`)
  }

  if (isDisabled !== undefined) {
    updateData.isDisabled = !!isDisabled
    auditActions.push(isDisabled ? "disabled" : "enabled")
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  // Increment tokenVersion so all existing JWT sessions are invalidated
  updateData.tokenVersion = (target.tokenVersion ?? 0) + 1

  const user = await userRepository.update(userId, updateData)
  await logAuditEvent({
    userId: currentUserId,
    action: "UPDATE_USER",
    details: `Updated user ${target.name} (${target.email}): ${auditActions.join("; ")}`,
  })
  return NextResponse.json({ user })
}
