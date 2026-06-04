import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { facultySubjectRepository } from "@/lib/repositories/factory"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  try {
    const data = await facultySubjectRepository.list(id)
    return NextResponse.json({ facultySubjects: data })
  } catch {
    return NextResponse.json({ error: "Failed to fetch faculty-subjects" }, { status: 500 })
  }
}
