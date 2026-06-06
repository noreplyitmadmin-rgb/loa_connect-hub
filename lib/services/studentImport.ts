import { userRepository, sectionRepository, subjectRepository, facultySubjectRepository, studentEnrollmentRepository } from "@/lib/repositories/factory"

function parseSectionIdentifier(raw: string): { name: string; program: string } {
  const idx = raw.indexOf("-")
  if (idx === -1) return { name: raw, program: "" }
  return { program: raw.slice(0, idx).trim(), name: raw.slice(idx + 1).trim() }
}

const ALLOWED_DOMAINS = ["@lyceumalabang.edu.ph", "@itmlyceumalabang.onmicrosoft.com"]

export interface StudentCsvRow {
  email: string
  name: string
  subjectCode: string
  sectionName: string
  sectionProgram: string
}

export interface StudentImportResult {
  created: { name: string; email: string; role: string }[]
  enrolled: number
  failed: { row: number; email: string; subjectCode: string; section: string; remark: string }[]
  parseErrors: { row: number; message: string }[]
  successCsv: string
  failureCsv: string
  totalRows: number
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function toCsv(rows: Record<string, string>[], headers: string[]): string {
  const header = headers.map(escapeCsv).join(",")
  const lines = rows.map((r) => headers.map((h) => escapeCsv(r[h] ?? "")).join(","))
  return [header, ...lines].join("\n")
}

export function parseStudentCsv(text: string): {
  rows: StudentCsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: StudentCsvRow[] = []
  const errors: { row: number; message: string }[] = []

  if (lines.length === 0) return { rows, errors, headerError: "CSV file is empty" }

  const rawHeaders = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const hasName = rawHeaders.length > 1 && rawHeaders[1] === "name"
  const expected = hasName
    ? ["student email", "name", "subject code", "section"]
    : ["student email", "subject code", "section"]
  const minCols = expected.length

  if (rawHeaders.length < minCols || rawHeaders[0] !== "student email") {
    return { rows, errors, headerError: `Expected headers: ${expected.join(", ")}` }
  }

  if (hasName && rawHeaders[2] !== "subject code") {
    return { rows, errors, headerError: `Expected headers: ${expected.join(", ")}` }
  }
  if (!hasName && rawHeaders[1] !== "subject code") {
    return { rows, errors, headerError: `Expected headers: ${expected.join(", ")}` }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    if (cols.length < minCols) {
      errors.push({ row: i + 1, message: `Expected at least ${minCols} columns, got ${cols.length}` })
      continue
    }

    const email = cols[0].toLowerCase().trim()
    const displayName = hasName ? cols[1].trim() : ""
    const subjectCode = hasName ? cols[2].trim() : cols[1].trim()
    const sectionRaw = cols.slice(hasName ? 3 : 2).join(", ").trim()
    const { program, name: sectionName } = parseSectionIdentifier(sectionRaw)

    if (!email) { errors.push({ row: i + 1, message: "Student email is required" }); continue }
    if (!ALLOWED_DOMAINS.some((d) => email.endsWith(d))) {
      errors.push({ row: i + 1, message: `Email must end with ${ALLOWED_DOMAINS.join(" or ")}` }); continue
    }
    if (!subjectCode) { errors.push({ row: i + 1, message: "Subject code is required" }); continue }
    if (!sectionName) { errors.push({ row: i + 1, message: "Section is required" }); continue }

    rows.push({ email, name: displayName, subjectCode, sectionName, sectionProgram: program })
  }

  return { rows, errors }
}

export async function importStudents(
  rows: StudentCsvRow[],
  departmentId: string | null,
): Promise<StudentImportResult> {
  const failed: StudentImportResult["failed"] = []
  const created: StudentImportResult["created"] = []
  let enrolled = 0

  if (rows.length === 0) {
    return { created, enrolled, failed, parseErrors: [], successCsv: "", failureCsv: "", totalRows: 0 }
  }

  const uniqueEmails = [...new Set(rows.map((r) => r.email.toLowerCase().trim()))]
  const userMap = await userRepository.findManyByEmail(uniqueEmails)
  const missingEmails = uniqueEmails.filter((e) => !userMap.has(e))
  if (missingEmails.length > 0) {
    const nameByEmail = new Map(rows.map((r) => [r.email.toLowerCase().trim(), r.name]))
    const createdUsers = await userRepository.createMany(
      missingEmails.map((email) => ({
        email,
        name: nameByEmail.get(email) || email.split("@")[0] || email,
        role: "STUDENT",
        departmentId,
      })),
    )
    for (const [, user] of createdUsers) {
      created.push({ name: user.name, email: user.email, role: "STUDENT" })
      userMap.set(user.email.toLowerCase(), user)
    }
  }

  const subjects = new Map<string, { id: string }>()
  for (const code of [...new Set(rows.map((r) => r.subjectCode))]) {
    const s = await subjectRepository.findByCode(code)
    if (s) subjects.set(code, s)
  }

  const sections = new Map<string, { id: string }>()
  for (const key of [...new Set(rows.map((r) => `${r.sectionName}|${r.sectionProgram}`))]) {
    const [name, program] = key.split("|")
    const s = await sectionRepository.findByNameAndProgram(name, program)
    if (s) sections.set(key, s)
  }

  const toEnroll: { student_id: string; section_id: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    const rowNum = i + 1
    const sectionLabel = `${r.sectionProgram}-${r.sectionName}`

    const user = userMap.get(r.email.toLowerCase().trim())
    if (!user) { failed.push({ row: rowNum, email: r.email, subjectCode: r.subjectCode, section: sectionLabel, remark: "Student not found" }); continue }

    const subject = subjects.get(r.subjectCode)
    if (!subject) { failed.push({ row: rowNum, email: r.email, subjectCode: r.subjectCode, section: sectionLabel, remark: `Subject "${r.subjectCode}" not found` }); continue }

    const section = sections.get(`${r.sectionName}|${r.sectionProgram}`)
    if (!section) { failed.push({ row: rowNum, email: r.email, subjectCode: r.subjectCode, section: sectionLabel, remark: `Section "${sectionLabel}" not found` }); continue }

    const mapping = await facultySubjectRepository.findBySubjectAndSection(subject.id, section.id)
    if (!mapping) { failed.push({ row: rowNum, email: r.email, subjectCode: r.subjectCode, section: sectionLabel, remark: `No faculty assigned to ${r.subjectCode} in ${sectionLabel}` }); continue }

    toEnroll.push({ student_id: user.id, section_id: section.id })
    enrolled++
  }

  if (toEnroll.length > 0) {
    await studentEnrollmentRepository.addEnrollments(toEnroll)
  }

  const successRows = rows
    .filter((r) => !failed.some((f) => f.email === r.email && f.subjectCode === r.subjectCode && f.section === `${r.sectionProgram}-${r.sectionName}`))
    .map((r) => ({ "student email": r.email, name: r.name, "subject code": r.subjectCode, section: `${r.sectionProgram}-${r.sectionName}` }))

  const failureRows = failed.map((f) => ({
    "student email": f.email,
    name: rows.find((r) => r.email === f.email && r.subjectCode === f.subjectCode)?.name ?? "",
    "subject code": f.subjectCode,
    section: f.section,
    remarks: f.remark,
  }))

  return {
    created,
    enrolled,
    failed,
    parseErrors: [],
    successCsv: toCsv(successRows, ["student email", "name", "subject code", "section"]),
    failureCsv: toCsv(failureRows, ["student email", "name", "subject code", "section", "remarks"]),
    totalRows: rows.length,
  }
}

export function getStudentCsvTemplate(): string {
  const headers = "student email, name, subject code, section"
  const sample = "alice.student@lyceumalabang.edu.ph, Alice Student, ELEC-323, BSIT-32A1\nbob.martinez@itmlyceumalabang.onmicrosoft.com, Bob Martinez, CCS-412, BSCS-41B2"
  return `${headers}\n${sample}\n`
}
