import { userRepository, departmentRepository } from "@/lib/repositories/factory"
import type { CsvRow } from "./csvParser"

export interface ImportResult {
  created: { name: string; email: string; role: string; department: string | null; course: string | null }[]
  skipped: { row: number; email: string; reason: string }[]
  errors: { row: number; email?: string; message: string }[]
}

export async function importUsers(
  rows: CsvRow[],
  uploaderRole: "DEAN" | "FACULTY",
  uploaderDepartmentId: string | null,
): Promise<ImportResult> {
  const result: ImportResult = { created: [], skipped: [], errors: [] }
  const departmentsCache = new Map<string, string | null>()

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      // Check duplicate
      const existing = await userRepository.findByEmail(row.email)
      if (existing) {
        result.skipped.push({ row: rowNum, email: row.email, reason: "Email already exists" })
        continue
      }

      let departmentId: string | null = null

      if (row.department) {
        if (departmentsCache.has(row.department)) {
          departmentId = departmentsCache.get(row.department) ?? null
        } else {
          const allDepts = await departmentRepository.listAll()
          let dept = allDepts.find((d) => d.name.toLowerCase() === row.department!.toLowerCase())
          if (!dept) {
            dept = allDepts.find((d) => d.code.toLowerCase() === row.department!.toLowerCase())
          }
          if (!dept) {
            const code = row.department!.toUpperCase().replace(/\s+/g, "_").substring(0, 50)
            try {
              dept = await departmentRepository.create({ name: row.department!, code })
            } catch {
              dept = allDepts.find((d) => d.code === code)
            }
          }
          if (dept) {
            departmentId = dept.id
            departmentsCache.set(row.department!, departmentId)
          }
        }
      }

      // Determine role
      let role: "STUDENT" | "FACULTY" | "DEAN"

      if (uploaderRole === "DEAN") {
        if (row.department && row.isDean) {
          role = "DEAN"
        } else if (row.department) {
          role = "FACULTY"
        } else {
          role = "STUDENT"
        }
      } else {
        role = "STUDENT"
      }

      // Faculty uploading students — ensure no department override
      if (uploaderRole === "FACULTY" && role !== "STUDENT") {
        result.errors.push({ row: rowNum, email: row.email, message: "Faculty can only upload students (no department column or isDean must be false)" })
        continue
      }

      const deptForCreate = role === "STUDENT" ? null : departmentId

      const user = await userRepository.create({
        name: row.name,
        email: row.email,
        passwordHash: null,
        role,
        departmentId: deptForCreate,
        course: row.course,
      })

      result.created.push({
        name: user.name,
        email: user.email,
        role: user.role,
        department: row.department || null,
        course: row.course || null,
      })
    } catch (err) {
      result.errors.push({
        row: rowNum,
        email: row.email,
        message: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return result
}
