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
    const { student_id, name, email, faculty_subject_id, section_id, semesterId } = await request.json()
    if (!faculty_subject_id) {
      return NextResponse.json({ error: "faculty_subject_id is required" }, { status: 400 })
    }

    let resolvedStudentId = student_id
    let createdNewUser = false
    let normalEmail = ""

    if (!resolvedStudentId) {
      if (!name || !email) {
        return NextResponse.json({ error: "Either student_id or name+email is required" }, { status: 400 })
      }
      normalEmail = email.toLowerCase().trim()

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", normalEmail)
        .maybeSingle()

      if (existingUser) {
        resolvedStudentId = existingUser.id
      } else {
        const { data: newUser, error: createErr } = await supabase
          .from("users")
          .insert({ name, email: normalEmail })
          .select("id")
          .single()
        if (createErr) {
          if (createErr.code === "23505") {
            return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 })
          }
          return NextResponse.json({ error: createErr.message }, { status: 500 })
        }
        resolvedStudentId = newUser.id
        createdNewUser = true

        const { error: roleErr } = await supabase
          .from("userrole")
          .insert({ userId: newUser.id, roleName: "STUDENT" })
        if (roleErr) return NextResponse.json({ error: roleErr.message }, { status: 500 })
      }
    }

    const row: Record<string, unknown> = { student_id: resolvedStudentId, faculty_subject_id, semesterId: semesterId || null }
    if (section_id) {
      row.section_id = section_id
    } else {
      const { data: fs } = await supabase.from("faculty_subjects").select("section_id").eq("id", faculty_subject_id).single()
      if (!fs) return NextResponse.json({ error: "Faculty-subject mapping not found" }, { status: 404 })
      row.section_id = fs.section_id
    }

    const { data, error } = await supabase
      .from("student_enrollments")
      .insert(row)
      .select("*")
      .single()

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json({ error: "This enrollment already exists" }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const currentUserId = (session!.user as Record<string, unknown>).id as string
    await logAuditEvent({
      userId: currentUserId,
      action: "CREATE_ENROLLMENT",
      details: createdNewUser
        ? `Created student ${name} (${normalEmail}) and enrolled in faculty-subject ${faculty_subject_id}`
        : `Enrolled student ${resolvedStudentId} in faculty-subject ${faculty_subject_id}`,
    })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
