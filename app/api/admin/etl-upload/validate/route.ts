import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { hasRole } from "@/lib/utils/roles"
import { userRepository } from "@/lib/repositories/factory"
import { STUDENT_DOMAIN, FACULTY_DOMAIN, type EtlUploadType } from "@/lib/constants"

export interface ValidateRow {
  rowIndex: number
  name: string
  email: string
  department: string | null
  course: string | null
  isDean: boolean
  isValid: boolean
  errors: string[]
}

interface ValidateBody {
  type: EtlUploadType
  csv: string
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: ValidateBody = await req.json()
  const { type, csv } = body

  if (!csv) {
    return NextResponse.json({ error: "CSV content is required" }, { status: 400 })
  }

  const rows: ValidateRow[] = []
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)

  if (lines.length < 2) {
    return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 })
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const nameIdx = headers.indexOf("name")
  const emailIdx = headers.indexOf("email")
  const deptIdx = headers.indexOf("department")
  const courseIdx = headers.indexOf("course")
  const deanIdx = headers.indexOf("dean")

  if (nameIdx === -1 || emailIdx === -1) {
    return NextResponse.json({ error: "CSV must have 'name' and 'email' columns" }, { status: 400 })
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    const errors: string[] = []
    const name = cols[nameIdx] || ""
    const email = (cols[emailIdx] || "").toLowerCase().trim()
    const department = deptIdx !== -1 ? (cols[deptIdx] || null) : null
    const course = courseIdx !== -1 ? (cols[courseIdx] || null) : null
    const isDean = deanIdx !== -1 ? cols[deanIdx]?.toLowerCase() === "true" : false

    if (!name) errors.push("Name is required")
    if (!email) errors.push("Email is required")

    if (email) {
      if (type === "student") {
        if (!email.endsWith(STUDENT_DOMAIN)) {
          errors.push(`Email must end with ${STUDENT_DOMAIN}`)
        }
      } else {
        if (!email.endsWith(FACULTY_DOMAIN)) {
          errors.push(`Email must end with ${FACULTY_DOMAIN}`)
        }
      }

      if (errors.length === 0 || !errors.some((e) => e.startsWith("Email must end with"))) {
        const existing = await userRepository.findByEmail(email)
        if (existing) {
          errors.push("Email already exists in the system")
        }
      }
    }

    rows.push({
      rowIndex: i,
      name,
      email,
      department,
      course,
      isDean,
      isValid: errors.length === 0,
      errors,
    })
  }

  return NextResponse.json({ rows })
}
