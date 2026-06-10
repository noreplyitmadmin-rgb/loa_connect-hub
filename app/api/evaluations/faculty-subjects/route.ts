import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getFacultySubjectsByStudent } from "@/features/evaluations/evaluations.service"

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const facultyId = searchParams.get("facultyId")
  const semesterId = searchParams.get("semesterId")

  if (!facultyId || !semesterId) {
    return NextResponse.json({ error: "facultyId and semesterId are required" }, { status: 400 })
  }

  const userId = (session.user as Record<string, unknown>).id as string

  try {
    const subjects = await getFacultySubjectsByStudent(userId, facultyId, semesterId)
    return NextResponse.json({ subjects })
  } catch {
    return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 })
  }
}
