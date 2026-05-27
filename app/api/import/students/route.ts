import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCsv, getCsvTemplate } from "@/lib/services/csvParser"
import { importUsers } from "@/lib/services/userImport"
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
  const role = (session?.user as any)?.role
  if (!role || (!hasRole(role, "FACULTY") && !hasRole(role, "DEAN"))) {
    return NextResponse.json({ error: "Unauthorized — Faculty or Dean only" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
  }

  const text = await file.text()
  const { rows, errors: parseErrors, headerError } = parseCsv(text, "students")
  if (headerError) {
    return NextResponse.json({ error: `Header mismatch: ${headerError}` }, { status: 400 })
  }
  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: "CSV parsing failed", details: parseErrors }, { status: 400 })
  }

  const result = await importUsers(rows, "FACULTY", null)

  await logAuditEvent({
    userId: (session!.user as any).id,
    action: "CREATE_USER",
    details: `Imported ${result.created.length} students (${result.skipped.length} skipped, ${result.errors.length} errors)`,
  })

  return NextResponse.json({ ...result, parseErrors })
}
