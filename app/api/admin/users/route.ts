import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"
import { logAuditEvent } from "@/lib/services/audit"
import { hasRole, getRoleList } from "@/lib/utils/roles"

const DEFAULT_ADMIN_EMAIL = "admin@econsult.com"
const VALID_ROLES = ["STUDENT", "FACULTY", "DEAN", "ADMIN", "GUEST"]

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const departments = await departmentRepository.listAll()

  if (hasRole(role, "ADMIN")) {
    const users = await userRepository.listAll()
    return NextResponse.json({ users, departments })
  }

  // Dean: only see faculty in their department
  const dept = await departmentRepository.findByDeanId((session!.user as any).id)
  if (!dept) return NextResponse.json({ users: [], departments })

  const deptFaculty = await userRepository.listByDepartment(dept.id)
  const facultyOnly = deptFaculty.filter((u) => hasRole(u.role, "FACULTY") || hasRole(u.role, "DEAN"))
  return NextResponse.json({ users: facultyOnly, departments })
}

/**
 * Validate that a set of roles doesn't violate STUDENT exclusivity.
 * Students cannot also have ADMIN, DEAN, or FACULTY roles.
 */
function validateStudentExclusivity(roleStr: string, auditActions: string[]): boolean {
  const roles = getRoleList(roleStr)
  const hasStudent = roles.includes("STUDENT")
  const hasOther = roles.some((r) => r === "ADMIN" || r === "DEAN" || r === "FACULTY")
  if (hasStudent && hasOther) {
    auditActions.push("REJECTED: STUDENT cannot be combined with ADMIN/DEAN/FACULTY")
    return false
  }
  return true
}

/**
 * Prevent disabling or removing roles from the default admin account.
 */
function isDefaultAdmin(target: { email: string }): boolean {
  return target.email === DEFAULT_ADMIN_EMAIL
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized — Admin only" }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, role: newRole, departmentId } = body
  const currentUserId = (session!.user as any).id

  if (!name || !email) {
    return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
  }

  if (!newRole) {
    return NextResponse.json({ error: "At least one role is required" }, { status: 400 })
  }

  // Validate student exclusivity
  const auditValidation: string[] = []
  if (!validateStudentExclusivity(newRole, auditValidation)) {
    return NextResponse.json({ error: "Students cannot also have ADMIN, DEAN, or FACULTY roles" }, { status: 400 })
  }

  // Check for duplicate email
  const existing = await userRepository.findByEmail(email)
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 })
  }

  const user = await userRepository.create({
    name,
    email,
    passwordHash: null,
    role: newRole,
    departmentId: departmentId || null,
  })

  await logAuditEvent({
    userId: currentUserId,
    action: "CREATE_USER",
    details: `Created user ${user.name} (${user.email}) with role(s): ${user.role}`,
  })

  return NextResponse.json({ user }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const body = await request.json()
  const { userId, isDisabled, role: newRole, name, email, departmentId, onboardingVersion } = body
  const currentUserId = (session!.user as any).id

  const target = await userRepository.findById(userId)
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // ── Guards ──────────────────────────────────────────────

  // Prevent disabling the default admin
  if (isDefaultAdmin(target) && isDisabled) {
    return NextResponse.json({ error: "Cannot disable the default admin account" }, { status: 403 })
  }

  // Only ADMIN can change roles (not DEAN)
  if (newRole !== undefined) {
    if (!hasRole(role, "ADMIN")) {
      return NextResponse.json({ error: "Only admins can change user roles" }, { status: 403 })
    }
    // Admin cannot change their own role
    if (target.id === currentUserId) {
      return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 })
    }
  }

  // Admin cannot disable themselves
  if (hasRole(role, "ADMIN") && target.id === currentUserId && isDisabled) {
    return NextResponse.json({ error: "You cannot disable your own account" }, { status: 400 })
  }

  // Cannot disable the last active Admin (excluding default admin guard above)
  if (hasRole(target.role, "ADMIN") && isDisabled) {
    const allAdmins = await userRepository.listByRole("ADMIN")
    const activeAdmins = allAdmins.filter((a: any) => !a.isDisabled)
    if (activeAdmins.length <= 1 && activeAdmins[0]?.id === target.id) {
      return NextResponse.json({ error: "Cannot disable the only active admin" }, { status: 400 })
    }
  }

  // Prevent editing the default admin's email
  if (isDefaultAdmin(target) && email !== undefined && email !== DEFAULT_ADMIN_EMAIL) {
    return NextResponse.json({ error: "Cannot change the default admin email" }, { status: 403 })
  }

  if (hasRole(role, "DEAN")) {
    const dept = await departmentRepository.findByDeanId((session!.user as any).id)
    if (!dept || (target.departmentId !== dept.id && target.id !== currentUserId)) {
      return NextResponse.json({ error: "Cannot manage users outside your department" }, { status: 403 })
    }
    if (hasRole(target.role, "STUDENT")) {
      return NextResponse.json({ error: "Deans can only manage faculty members" }, { status: 403 })
    }
  }

  // ── Build update payload ────────────────────────────────
  const updateData: Record<string, any> = {}
  const auditActions: string[] = []

  // Role change
  if (newRole !== undefined) {
    // Validate student exclusivity
    if (!validateStudentExclusivity(newRole, auditActions)) {
      return NextResponse.json({ error: "Students cannot also have ADMIN, DEAN, or FACULTY roles" }, { status: 400 })
    }
    updateData.role = newRole
    auditActions.push(`changed role from ${target.role} to ${newRole}`)
  }

  // Disable/enable
  if (isDisabled !== undefined) {
    updateData.isDisabled = !!isDisabled
    auditActions.push(isDisabled ? "disabled" : "enabled")
  }

  // Profile fields (Admin only)
  if (hasRole(role, "ADMIN")) {
    if (name !== undefined) {
      updateData.name = name
      auditActions.push(`changed name to ${name}`)
    }
    if (email !== undefined) {
      updateData.email = email
      auditActions.push(`changed email to ${email}`)
    }
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId || null
      auditActions.push(departmentId ? "changed department" : "removed department")
    }
    if (onboardingVersion !== undefined) {
      updateData.onboardingVersion = onboardingVersion
      auditActions.push(onboardingVersion === 0 ? "reset onboarding" : `set onboardingVersion to ${onboardingVersion}`)
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No changes provided" }, { status: 400 })
  }

  // Increment tokenVersion when role, isDisabled, or email changes
  if (newRole !== undefined || isDisabled !== undefined || email !== undefined) {
    updateData.tokenVersion = (target.tokenVersion ?? 0) + 1
  }

  const user = await userRepository.update(userId, updateData)
  await logAuditEvent({
    userId: currentUserId,
    action: "UPDATE_USER",
    details: `Updated user ${target.name} (${target.email}): ${auditActions.join("; ")}`,
  })
  return NextResponse.json({ user })
}
