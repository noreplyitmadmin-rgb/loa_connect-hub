import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { parseCsv } from "@/lib/services/csvParser"
import { userRepository } from "@/lib/repositories/factory"
import { hasRole } from "@/lib/utils/roles"

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as Record<string, unknown>)?.role as string
  if (!role || (!hasRole(role, "ADMIN") && !hasRole(role, "DEAN") && !hasRole(role, "FACULTY"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const templateType = (formData.get("type") as string) || "full"

  if (!file) {
    return NextResponse.json({ error: "CSV file is required" }, { status: 400 })
  }

  if (templateType !== "full" && templateType !== "students") {
    return NextResponse.json({ error: "Invalid import type" }, { status: 400 })
  }

  const text = await file.text()
  const { rows, errors: parseErrors, headerError } = parseCsv(text, templateType)
  if (headerError) {
    return NextResponse.json({ error: `Header mismatch: ${headerError}` }, { status: 400 })
  }

  // Check each email against existing users
  const previewRows = await Promise.all(
    rows.map(async (row) => {
      const existingUser = row.email ? await userRepository.findByEmail(row.email) : null
      return {
        row: 0, // will be assigned client-side
        name: row.name,
        email: row.email,
        section: row.section || "",
        code: row.code || "",
        title: row.title || "",
        course: row.course || "",
        emailExists: !!existingUser,
        existingName: existingUser?.name || null,
      }
    })
  )

  return NextResponse.json({
    rows: previewRows,
    parseErrors,
    totalRows: rows.length,
  })
}
