import { userRepository, departmentRepository, availabilityRuleRepository } from "@/lib/repositories/factory"
import type { CsvRow } from "./csvParser"
import { hasRole } from "@/lib/utils/roles"

const TODAY = new Date().toISOString().split("T")[0]

function createDefaultAvailabilityRules(facultyId: string) {
  const rules = [
    { dayOfWeek: 0, startTime: "08:00", endTime: "17:00", isBlocked: false },
    { dayOfWeek: 1, startTime: "08:00", endTime: "17:00", isBlocked: false },
    { dayOfWeek: 2, startTime: "08:00", endTime: "17:00", isBlocked: false },
    { dayOfWeek: 3, startTime: "08:00", endTime: "17:00", isBlocked: false },
    { dayOfWeek: 4, startTime: "08:00", endTime: "17:00", isBlocked: false },
    { dayOfWeek: 5, isBlocked: true },
    { dayOfWeek: 6, isBlocked: true },
  ]
  return Promise.all(
    rules.map((r) =>
      availabilityRuleRepository.upsert({
        facultyId,
        dayOfWeek: r.dayOfWeek,
        isBlocked: r.isBlocked,
        startTime: r.startTime,
        endTime: r.endTime,
        startDate: TODAY,
      })
    )
  )
}

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

      const role = uploaderRole === "DEAN" ? "FACULTY" : "STUDENT"

      // Faculty uploading students — ensure no department override
      if (hasRole(uploaderRole, "FACULTY") && !hasRole(role, "STUDENT")) {
        result.errors.push({ row: rowNum, email: row.email, message: "Faculty can only upload students" })
        continue
      }

      const deptForCreate = hasRole(role, "STUDENT") ? uploaderDepartmentId : departmentId

      const user = await userRepository.create({
        name: row.name,
        email: row.email,
        passwordHash: null,
        role,
        departmentId: deptForCreate,
        course: row.course,
        employeeNo: row.employeeNo,
      })

      if (hasRole(role, "FACULTY") || hasRole(role, "DEAN")) {
        await createDefaultAvailabilityRules(user.id)
      }

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
