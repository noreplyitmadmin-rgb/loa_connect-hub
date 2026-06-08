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
  const expected = ["name", "email", "subject code", "section"]

  if (rawHeaders.length < expected.length || rawHeaders[0] !== "name" || rawHeaders[1] !== "email") {
    return { rows, errors, headerError: `Expected headers: ${expected.join(", ")}` }
  }

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    if (cols.length < expected.length) {
      errors.push({ row: i + 1, message: `Expected ${expected.length} columns, got ${cols.length}` })
      continue
    }

    const displayName = cols[0].trim()
    const email = cols[1].toLowerCase().trim()
    const subjectCode = cols[2].trim()
    const sectionRaw = cols.slice(3).join(", ").trim()
    const { program, name: sectionName } = parseSectionIdentifier(sectionRaw)

    if (!displayName) { errors.push({ row: i + 1, message: "Name is required" }); continue }
    if (!email) { errors.push({ row: i + 1, message: "Email is required" }); continue }
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
  semesterId: string | null,
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

  const toEnroll: { student_id: string; section_id: string; semesterId?: string | null }[] = []

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

    toEnroll.push({ student_id: user.id, section_id: section.id, semesterId })
    enrolled++
  }

  if (toEnroll.length > 0) {
    await studentEnrollmentRepository.addEnrollments(toEnroll)
  }

  const successRows = rows
    .filter((r) => !failed.some((f) => f.email === r.email && f.subjectCode === r.subjectCode && f.section === `${r.sectionProgram}-${r.sectionName}`))
    .map((r) => ({ name: r.name, email: r.email, "subject code": r.subjectCode, section: `${r.sectionProgram}-${r.sectionName}` }))

  const failureRows = failed.map((f) => ({
    name: rows.find((r) => r.email === f.email && r.subjectCode === f.subjectCode)?.name ?? "",
    email: f.email,
    "subject code": f.subjectCode,
    section: f.section,
    remarks: f.remark,
  }))

  return {
    created,
    enrolled,
    failed,
    parseErrors: [],
    successCsv: toCsv(successRows, ["name", "email", "subject code", "section"]),
    failureCsv: toCsv(failureRows, ["name", "email", "subject code", "section", "remarks"]),
    totalRows: rows.length,
  }
}

export function getStudentCsvTemplate(): string {
  const headers = "name, email, subject code, section"
  const sample = "Alice Student, alice.student@itmlyceumalabang.onmicrosoft.com, CS101, BSIT-32A3\nBob Martinez, bob.martinez@itmlyceumalabang.onmicrosoft.com, MATH201, BSCS-21B"
  return `${headers}\n${sample}\n`
}
