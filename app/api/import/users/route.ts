import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCsv, getCsvTemplate } from "@/lib/services/csvParser"
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
  const role = (session?.user as any)?.role
  if (!role || (!hasRole(role, "DEAN") && !hasRole(role, "ADMIN"))) {
    return NextResponse.json({ error: "Unauthorized — Dean or Admin only" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  if (!file) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
  }

  const text = await file.text()
  const { rows, errors: parseErrors, headerError } = parseCsv(text, "full")
  if (headerError) {
    return NextResponse.json({ error: `Header mismatch: ${headerError}` }, { status: 400 })
  }
  if (parseErrors.length > 0 && rows.length === 0) {
    return NextResponse.json({ error: "CSV parsing failed", details: parseErrors }, { status: 400 })
  }

  const userId = (session!.user as any).id
  let departmentId: string | null = null
  if (hasRole(role, "DEAN")) {
    const dept = await departmentRepository.findByDeanId(userId)
    departmentId = dept?.id ?? null
  }

  const result = await importUsers(rows, "DEAN", departmentId)

  await logAuditEvent({
    userId: (session!.user as any).id,
    action: "CREATE_USER",
    details: `Imported ${result.created.length} users (${result.skipped.length} skipped, ${result.errors.length} errors)`,
  })

  return NextResponse.json({ ...result, parseErrors })
}
