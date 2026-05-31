import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { userRepository, departmentRepository } from "@/lib/repositories/factory"

export async function GET(req: Request) {
  const session = await auth()
  const currentUser = session?.user as Record<string, unknown> | undefined
  if (!currentUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const currentUserId = currentUser.id as string
  const { searchParams } = new URL(req.url)
  const department = searchParams.get("department") || "all"

  const departments = await departmentRepository.listAll()
  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const facultyUsers = await userRepository.listByRole("FACULTY")

  const users = facultyUsers
    .filter((f) => !f.isDisabled && f.id !== currentUserId)
    .map((f) => ({
      id: f.id,
      name: f.name,
      email: f.email,
      department: f.departmentId ? deptMap.get(f.departmentId) || null : null,
    }))
    .filter((u) => department === "all" || u.department === department)

  return NextResponse.json({ users })
}
