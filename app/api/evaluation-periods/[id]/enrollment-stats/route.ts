import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { subjectRepository, facultySubjectRepository, studentEnrollmentRepository } from "@/lib/repositories/factory"

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  try {
    const [subjects, facultySubjects, enrollments] = await Promise.all([
      subjectRepository.list(id),
      facultySubjectRepository.list(id),
      studentEnrollmentRepository.list(id),
    ])
    return NextResponse.json({
      data: {
        subjectCount: subjects.length,
        facultyCount: new Set(facultySubjects.map((f) => f.facultyId)).size,
        enrollmentCount: enrollments.length,
        studentCount: new Set(enrollments.map((e) => e.studentId)).size,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
