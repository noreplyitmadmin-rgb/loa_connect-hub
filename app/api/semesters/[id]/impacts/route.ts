import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import {
  facultySubjectRepository,
  studentEnrollmentRepository,
  evaluationRepository,
  evaluationResultRepository,
  sectionRepository,
} from "@/lib/repositories/factory"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  try {
    const [facultySubjects, enrollments, evaluations, results, sections] = await Promise.all([
      facultySubjectRepository.countBySemesterId(id),
      studentEnrollmentRepository.countBySemesterId(id),
      evaluationRepository.countBySemesterId(id),
      evaluationResultRepository.countBySemesterId(id),
      sectionRepository.countBySemesterId(id),
    ])

    return NextResponse.json({
      facultySubjects,
      enrollments,
      evaluations,
      results,
      sections,
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch impacts" }, { status: 500 })
  }
}
