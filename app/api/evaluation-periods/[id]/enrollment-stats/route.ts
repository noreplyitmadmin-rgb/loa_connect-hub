import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { subjectRepository, facultySubjectRepository, studentEnrollmentRepository, sectionRepository } from "@/lib/repositories/factory"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const role = (session.user as Record<string, unknown>).role as string
  if (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const [subjects, facultySubjects, enrollments, sections] = await Promise.all([
      subjectRepository.list(),
      facultySubjectRepository.list(),
      studentEnrollmentRepository.list(),
      sectionRepository.list(),
    ])
    return NextResponse.json({
      data: {
        subjectCount: subjects.length,
        sectionCount: sections.length,
        facultyCount: new Set(facultySubjects.map((f) => f.faculty_id)).size,
        enrollmentCount: enrollments.length,
        studentCount: new Set(enrollments.map((e) => e.student_id)).size,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 })
  }
}
