import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { requireAdmin } from "@/lib/route-guard"

const ALLOWED_DOMAIN = "@itmlyceumalabang.onmicrosoft.com"

const TEMPLATE_CSV = `student name,email
Juan Dela Cruz,juan.dela.cruz${ALLOWED_DOMAIN}
Maria Santos,maria.santos${ALLOWED_DOMAIN}
`

export async function GET() {
  return new NextResponse(TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="enrollment_template.csv"',
    },
  })
}

interface CsvRow {
  name: string
  email: string
}

interface ImportResult {
  matched: number
  created: number
  errors: { row: number; email: string; message: string }[]
}

export async function POST(request: NextRequest) {
  const authErr = await requireAdmin(request)
  if (authErr) return authErr

  try {
    const { faculty_subject_id, rows, semesterId } = await request.json()
    if (!faculty_subject_id) {
      return NextResponse.json({ error: "faculty_subject_id is required" }, { status: 400 })
    }
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows must be a non-empty array" }, { status: 400 })
    }

    const { data: fs } = await supabase.from("faculty_subjects").select(`section_id, "semesterId"`).eq("id", faculty_subject_id).single()
    if (!fs) return NextResponse.json({ error: "Faculty-subject mapping not found" }, { status: 404 })
    const section_id = fs.section_id
    const resolvedSemesterId = semesterId || fs.semesterId || null

    const result: ImportResult = { matched: 0, created: 0, errors: [] }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as CsvRow
      const rowNum = i + 1
      const email = (row.email ?? "").trim().toLowerCase()

      if (!email) {
        result.errors.push({ row: rowNum, email: row.email ?? "", message: "Email is empty" })
        continue
      }
      if (!row.name) {
        result.errors.push({ row: rowNum, email, message: "Name is empty" })
        continue
      }
      if (!email.endsWith(ALLOWED_DOMAIN)) {
        result.errors.push({ row: rowNum, email, message: `Email must end with ${ALLOWED_DOMAIN}` })
        continue
      }

      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", email)
        .maybeSingle()

      let studentId: string
      if (existingUser) {
        studentId = existingUser.id
      } else {
        const { data: newUser, error: createErr } = await supabase
          .from("users")
          .insert({ name: row.name, email })
          .select("id")
          .single()
        if (createErr) {
          result.errors.push({ row: rowNum, email, message: createErr.message })
          continue
        }
        studentId = newUser.id
        const { error: roleErr } = await supabase
          .from("userrole")
          .insert({ userId: studentId, roleName: "STUDENT" })
        if (roleErr) {
          result.errors.push({ row: rowNum, email, message: `Created user but failed to assign role: ${roleErr.message}` })
          continue
        }
        result.created++
      }

      const { error: insErr } = await supabase.from("student_enrollments").insert({
        student_id: studentId,
        section_id,
        faculty_subject_id,
        semesterId: resolvedSemesterId,
      })
      if (insErr) {
        if (insErr.code === "23505") {
          result.errors.push({ row: rowNum, email, message: "Already enrolled" })
        } else {
          result.errors.push({ row: rowNum, email, message: insErr.message })
        }
        continue
      }
      result.matched++
    }

    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }
}
