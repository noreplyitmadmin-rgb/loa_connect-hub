import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCsv, getCsvTemplate } from "@/lib/services/csvParser"
import type { CsvRow } from "@/lib/services/csvParser"
import { importUsers } from "@/lib/services/userImport"
import { departmentRepository } from "@/lib/repositories/factory"
import { logAuditEvent } from "@/lib/services/audit"
import { hasRole } from "@/lib/utils/roles"

export async function GET() {
  const csv = getCsvTemplate("full")
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="import_users_template.csv"',
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "DEAN") && !hasRole(role, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized — Dean or Admin only" }, { status: 403 })
  }

  let rows: CsvRow[]
  let parseErrors: { row: number; message: string }[] = []
  const userId = (session!.user as Record<string, unknown>).id as string
  let departmentId: string | null = null
  if (hasRole(role, "DEAN")) {
    const dept = await departmentRepository.findByDeanId(userId)
    departmentId = dept?.id ?? null
  }

  const contentType = request.headers.get("content-type") || ""

  if (contentType.includes("application/json")) {
    const body = await request.json()
    rows = body.rows as CsvRow[]
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No rows provided" }, { status: 400 })
    }
    // Preview flow: department field in rows contains the department ID
    // (selected from the dropdown), not a department name from CSV.
    // Resolve the ID to the actual department name so importUsers can
    // find it by name lookup instead of trying to create a department
    // with the UUID as its name.
    const deptIdFromRows = rows[0]?.department
    if (deptIdFromRows) {
      const dept = await departmentRepository.findById(deptIdFromRows)
      if (dept) {
        departmentId = dept.id
        rows = rows.map((r) => ({ ...r, department: dept.name }))
      }
    }
  } else {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
    }

    const text = await file.text()
    const parsed = parseCsv(text, "full")
    rows = parsed.rows
    parseErrors = parsed.errors

    if (parsed.headerError) {
      return NextResponse.json({ error: `Header mismatch: ${parsed.headerError}` }, { status: 400 })
    }
    if (parseErrors.length > 0 && rows.length === 0) {
      return NextResponse.json({ error: "CSV parsing failed", details: parseErrors }, { status: 400 })
    }
  }

  const result = await importUsers(rows, "DEAN", departmentId)

  await logAuditEvent({
    userId: (session!.user as Record<string, unknown>).id as string,
    action: "CREATE_USER",
    details: `Imported ${result.created.length} users (${result.skipped.length} skipped, ${result.errors.length} errors)`,
  })

  return NextResponse.json({ ...result, parseErrors })
}
