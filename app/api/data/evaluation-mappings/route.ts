import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"

export async function GET(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get("type")

  if (type === "faculty") {
    const { data, error } = await supabase
      .from("faculty_subjects")
      .select(`
        id,
        faculty:facultyId (id, name, email),
        subject:subjectId (id, code, name),
        section:sectionId (id, name, program)
      `)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  if (type === "student") {
    const { data, error } = await supabase
      .from("student_enrollments")
      .select(`
        id,
        student:studentId (id, name, email),
        section:sectionId (id, name, program)
      `)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  }

  return NextResponse.json({ error: 'Invalid type — use "faculty" or "student"' }, { status: 400 })
}
