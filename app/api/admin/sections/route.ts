import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { auth } from "@/lib/auth"
import { requireAdmin } from "@/lib/route-guard"
import { logAuditEvent } from "@/lib/services/audit"

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  const session = await auth()

  try {
    const { name, departmentCourseId } = await request.json()
    if (!name || !departmentCourseId) {
      return NextResponse.json({ error: "Name and Department Course are required" }, { status: 400 })
    }

    const { data: course, error: courseErr } = await supabase
      .from("department_courses")
      .select("code")
      .eq("id", departmentCourseId)
      .single()
    if (courseErr || !course) {
      return NextResponse.json({ error: "Invalid department course" }, { status: 400 })
    }

    const sectionName = name.toUpperCase().trim()
    const { data, error } = await supabase
      .from("sections")
      .insert({ name: sectionName, program: course.code, departmentCourseId, isDisabled: false })
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: `Section "${course.code}-${sectionName}" already exists` }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_SECTION",
      details: `Created section ${course.code}-${sectionName}`,
    })

    return NextResponse.json(data, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
