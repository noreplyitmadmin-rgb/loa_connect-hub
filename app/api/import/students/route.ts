import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCsv, getCsvTemplate } from "@/lib/services/csvParser"
import type { CsvRow } from "@/lib/services/csvParser"
import { importUsers } from "@/lib/services/userImport"
import { departmentRepository, userRepository } from "@/lib/repositories/factory"
import { logAuditEvent } from "@/lib/services/audit"
import { hasRole } from "@/lib/utils/roles"

export async function GET() {
  const csv = getCsvTemplate("students")
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
    return NextResponse.json({ error: "Unauthorized — Faculty or Dean only" }, { status: 403 })
  }

  let rows: CsvRow[]
  let parseErrors: { row: number; message: string }[] = []
  const userId = (session!.user as Record<string, unknown>).id as string
  let departmentId: string | null = null
  const dept = await departmentRepository.findByDeanId(userId)
  if (dept) {
    departmentId = dept.id
  } else {
    if (!dept && role) {
      const userData = await userRepository.findById(userId)
      departmentId = userData?.departmentId ?? null
    }
  }

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    rows = body.rows as CsvRow[]
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }
    const deptIdFromRows = rows[0]?.department
    if (deptIdFromRows) {
      const resolved = await departmentRepository.findById(deptIdFromRows)
      if (resolved) {
        departmentId = resolved.id
        rows = rows.map((r) => ({ ...r, department: resolved.name }))
      }
    }
  } else {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseCsv(text, "students")
    rows = parsed.rows
    parseErrors = parsed.errors

    if (parsed.headerError) {
      return NextResponse.json({ error: `Header mismatch: ${parsed.headerError}` }, { status: 400 })
    }
    if (parseErrors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: "CSV parsing failed", details: parseErrors }, { status: 400 })
    }
  }

  const result = await importUsers(rows, "FACULTY", departmentId)

  await logAuditEvent({
    userId: (session!.user as Record<string, unknown>).id as string,
    action: "CREATE_USER",
    details: `Imported ${result.created.length} students (${result.skipped.length} skipped, ${result.errors.length} errors)`,
  })

  return NextResponse.json({ ...result, parseErrors })
}
