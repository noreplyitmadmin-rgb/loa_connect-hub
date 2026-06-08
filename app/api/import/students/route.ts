import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { parseStudentCsv, importStudents, getStudentCsvTemplate } from "@/lib/services/studentImport"
import { logAuditEvent } from "@/lib/services/audit"
import { departmentRepository } from "@/lib/repositories/factory"

export async function GET() {
  const csv = getStudentCsvTemplate()
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="import_students_template.csv"',
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN") && !hasRole(role, "ADMIN"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  let importRows: { email: string; name: string; subjectCode: string; sectionName: string; sectionProgram: string }[]
  let parseErrors: { row: number; message: string }[] = []
  let departmentId: string | null = null
  let semesterId: string | null = null

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    const { departmentId: bodyDeptId = null, semesterId: bodySemesterId = null } = body
    semesterId = bodySemesterId
    const rawRows = body.rows as { email: string; name?: string; subjectCode: string; section: string }[] | undefined
    if (!rawRows || !Array.isArray(rawRows) || rawRows.length === 0) {
      return NextResponse.json({ error: "Rows array is required" }, { status: 400 })
    }
    if (bodyDeptId) {
      const dept = await departmentRepository.findById(bodyDeptId)
      if (dept) departmentId = bodyDeptId
    }
    importRows = rawRows.map((r) => {
      const idx = (r.section || "").indexOf("-")
      const program = idx === -1 ? "" : r.section.slice(0, idx).trim()
      const sectionName = idx === -1 ? r.section.trim() : r.section.slice(idx + 1).trim()
      return { email: r.email.toLowerCase().trim(), name: r.name || "", subjectCode: r.subjectCode.trim(), sectionName, sectionProgram: program }
    })
  } else {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }
    const deptId = formData.get("departmentId") as string | null
    if (deptId) {
      const dept = await departmentRepository.findById(deptId)
      if (dept) departmentId = dept.id
    }

    const text = await file.text()
    const parsed = parseStudentCsv(text)
    if (parsed.headerError) {
      return NextResponse.json({ error: `Header mismatch: ${parsed.headerError}` }, { status: 400 })
    }
    if (parsed.errors.length > 0 && parsed.rows.length === 0) {
      return NextResponse.json({ error: "CSV parsing failed", details: parsed.errors }, { status: 400 })
    }
    importRows = parsed.rows
    parseErrors = parsed.errors
  }

  const result = await importStudents(importRows, departmentId, semesterId)
  result.parseErrors = parseErrors

  await logAuditEvent({
    userId: (session!.user as Record<string, unknown>).id as string,
    action: "IMPORT_STUDENTS",
    details: `Imported ${result.enrolled} enrollments (${result.failed.length} failed, ${result.parseErrors.length} parse errors)`,
  })

  return NextResponse.json(result)
}
