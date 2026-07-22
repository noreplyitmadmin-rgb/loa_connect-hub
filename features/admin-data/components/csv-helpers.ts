import type { FacultyMapping } from "./types"

export type CsvRow = { email: string; name: string; subjectCode: string; subjectName: string; section: string; departmentCode: string }

export interface CsvRowWithFlags extends CsvRow {
  isNewSubject: boolean
  isNewSection: boolean
  isNewTeacher: boolean
  isInvalidDept: boolean
  isExistingMapping: boolean
}

export interface CsvFlagContext {
  existingMappings: FacultyMapping[]
  validDeptCodes: string[]
  subjectCodes: string[]
  sectionPairs: { name: string; program: string }[]
  facultyEmails: string[]
}

export function deriveCsvFlags(rows: CsvRow[], ctx: CsvFlagContext): CsvRowWithFlags[] {
  const existingKeys = new Set(
    ctx.existingMappings.map((m) => `${m.faculty.email}|${m.subject.code}|${m.section.program}-${m.section.name}`)
  )
  const validDeptSet = new Set(ctx.validDeptCodes)
  const subjectSet = new Set(ctx.subjectCodes)
  const sectionPairs = ctx.sectionPairs
  const emailSet = new Set(ctx.facultyEmails)

  return rows.map((r) => {
    const idx = r.section.indexOf("-")
    const sectionProgram = idx === -1 ? "" : r.section.slice(0, idx).trim()
    const sectionName = idx === -1 ? r.section : r.section.slice(idx + 1).trim()
    return {
      ...r,
      isNewSubject: !subjectSet.has(r.subjectCode),
      isNewSection: !sectionPairs.some((s) => s.name === sectionName && s.program === sectionProgram),
      isNewTeacher: !emailSet.has(r.email),
      isInvalidDept: !validDeptSet.has(r.departmentCode),
      isExistingMapping: existingKeys.has(`${r.email}|${r.subjectCode}|${r.section}`),
    }
  })
}
