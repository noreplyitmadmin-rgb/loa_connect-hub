import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!role || (role !== "ADMIN" && role !== "DEAN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  if (role === "ADMIN") {
    const students = await userRepository.listByRole("STUDENT")
    const faculty = await userRepository.listByRole("FACULTY")
    const deans = await userRepository.listByRole("DEAN")
    const admins = await userRepository.listByRole("ADMIN")
    return NextResponse.json({ users: [...admins, ...deans, ...faculty, ...students] })
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

  const target = await userRepository.findById(userId)
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

  if (role === "DEAN") {
    const dept = await departmentRepository.findByDeanId((session!.user as any).id)
    if (!dept || (target.departmentId !== dept.id && target.id !== (session!.user as any).id)) {
      return NextResponse.json({ error: "Cannot manage users outside your department" }, { status: 403 })
    }
    if (target.role === "STUDENT") {
      return NextResponse.json({ error: "Deans can only manage faculty members" }, { status: 403 })
    }
  }

  const user = await userRepository.update(userId, { isDisabled: !!isDisabled })
  return NextResponse.json({ user })
}
