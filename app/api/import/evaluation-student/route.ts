import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { parseStudentEnrollmentCsv, importStudentEnrollments } from "@/lib/services/etlEvaluation"
import { logAuditEvent } from "@/lib/services/audit"

function parseSectionIdentifier(raw: string): { name: string; program: string } {
  const idx = raw.indexOf("-")
  if (idx === -1) return { name: raw, program: "" }
  return { program: raw.slice(0, idx).trim(), name: raw.slice(idx + 1).trim() }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || !hasRole(role, "ADMIN")) {
    return NextResponse.json({ error: "Forbidden — Admin only" }, { status: 403 })
  }

  let importRows: { email: string; sectionName: string; sectionProgram: string }[]
  let parseErrors: { row: number; message: string }[] = []

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    const rawRows = body.rows as { email: string; section: string }[] | undefined
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "Rows array is required" }, { status: 400 })
    }
    importRows = rawRows.map((r, i) => {
      const { program, name } = parseSectionIdentifier(r.section || "")
      return { email: r.email.toLowerCase().trim(), sectionName: name, sectionProgram: program }
    })
  } else {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseStudentEnrollmentCsv(text)
    if (parsed.headerError) {
      return NextResponse.json({ error: `Header mismatch: ${parsed.headerError}` }, { status: 400 })
    }
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return NextResponse.json({ error: "CSV parsing failed", details: parsed.errors }, { status: 400 })
    }
    importRows = parsed.rows
    parseErrors = parsed.errors
  }

  const result = await importStudentEnrollments(importRows)

  await logAuditEvent({
    userId: (session!.user as Record<string, unknown>).id as string,
    action: "ETL_STUDENT_ENROLLMENT",
    details: `Imported ${result.matched} student enrollments (${result.errors.length} errors)`,
  })

  return NextResponse.json({ ...result, parseErrors })
}
