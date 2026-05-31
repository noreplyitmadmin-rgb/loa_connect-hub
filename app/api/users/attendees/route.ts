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
  const studentUsers = await userRepository.listByRole("STUDENT")

  const all = [...facultyUsers, ...studentUsers]
    .filter((u) => !u.isDisabled && u.id !== currentUserId)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      department: u.departmentId ? deptMap.get(u.departmentId) || null : null,
    }))
    .filter((u) => department === "all" || u.department === department)

  // Deduplicate by id (users with multiple roles may appear in both lists)
  const seen = new Set<string>()
  const unique = all.filter((u) => {
    if (seen.has(u.id)) return false
    seen.add(u.id)
    return true
  })

  return NextResponse.json({ users: unique })
}
