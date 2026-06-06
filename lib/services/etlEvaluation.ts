import { userRepository, sectionRepository, subjectRepository, facultySubjectRepository, studentEnrollmentRepository } from "@/lib/repositories/factory"

function parseSectionIdentifier(raw: string): { name: string; program: string } {
  const idx = raw.indexOf("-")
  if (idx === -1) {
    return { name: raw, program: "" }
  }
  return {
    program: raw.slice(0, idx).trim(),
    name: raw.slice(idx + 1).trim(),
  }
}

// ── Faculty-Subject CSV ──────────────────────────────────
// Columns: faculty email, subject code, section (e.g., "BSIT-32A3")

interface FacultySubjectCsvRow {
  email: string
  name: string
  subjectCode: string
  sectionName: string
  sectionProgram: string
}

export interface FacultySubjectImportResult {
  matched: number
  errors: { row: number; email?: string; message: string }[]
  createdSubjects: number
  createdSections: number
}

export function parseFacultySubjectCsv(text: string): {
  rows: FacultySubjectCsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: FacultySubjectCsvRow[] = []
  const errors: { row: number; message: string }[] = []

  if (lines.length === 0) {
    return { rows, errors, headerError: "CSV file is empty" }
  }

  const headerLine = lines[0]
  const rawHeaders = headerLine.split(",").map((h) => h.trim().toLowerCase())

  const hasName = rawHeaders.length > 1 && rawHeaders[1] === "name"
  const minCols = hasName ? 4 : 3

  if (rawHeaders.length < minCols) {
    return {
      rows,
      errors,
      headerError: `Expected at least ${minCols} columns (faculty email${hasName ? ", name" : ""}, subject code, section), got ${rawHeaders.length}.`,
    }
  }

  if (rawHeaders[0] !== "faculty email") {
    return {
      rows,
      errors,
      headerError: `Expected headers: faculty email${hasName ? ", name" : ""}, subject code, section — got: ${rawHeaders.join(", ")}`,
    }
  }

  if (hasName && rawHeaders[2] !== "subject code") {
    return {
      rows,
      errors,
      headerError: `Expected headers: faculty email, name, subject code, section — got: ${rawHeaders.join(", ")}`,
    }
  }

  if (!hasName && rawHeaders[1] !== "subject code") {
    return {
      rows,
      errors,
      headerError: `Expected headers: faculty email, subject code, section — got: ${rawHeaders.join(", ")}`,
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.split(",").map((c) => c.trim())

    if (cols.length < minCols) {
      errors.push({ row: i + 1, message: `Expected at least ${minCols} columns, got ${cols.length}` })
      continue
    }

    const email = cols[0].toLowerCase().trim()
    const displayName = hasName ? cols[1].trim() : ""
    const subjectCode = hasName ? cols[2].trim() : cols[1].trim()
    const sectionRaw = cols.slice(hasName ? 3 : 2).join(", ").trim()
    const { program, name: sectionName } = parseSectionIdentifier(sectionRaw)

    if (email.length === 0) {
      errors.push({ row: i + 1, message: "Faculty email is required" })
      continue
    }

    if (subjectCode.length === 0) {
      errors.push({ row: i + 1, message: "Subject code is required" })
      continue
    }

    if (sectionName.length === 0) {
      errors.push({ row: i + 1, message: "Section is required" })
      continue
    }

    rows.push({ email, name: displayName, subjectCode, sectionName, sectionProgram: program })
  }

  return { rows, errors }
}

export async function importFacultySubjects(
  rows: FacultySubjectCsvRow[],
  departmentId?: string | null,
): Promise<FacultySubjectImportResult> {
  const result: FacultySubjectImportResult = {
    matched: 0,
    errors: [],
    createdSubjects: 0,
    createdSections: 0,
  }

  if (rows.length === 0) return result

  // ── Upsert subjects ──
  const uniqueSubjectCodes = [...new Set(rows.map((r) => r.subjectCode))]
  const subjectItems = uniqueSubjectCodes.map((code) => ({ code, name: code }))
  const { data: subjects, created: createdSubjects } = await subjectRepository.upsertMany(subjectItems)
  result.createdSubjects = createdSubjects

  // ── Upsert sections ──
  const sectionKeys = new Set<string>()
  const sectionItems: { name: string; program: string }[] = []
  for (const r of rows) {
    const key = `${r.sectionName}|${r.sectionProgram}`
    if (!sectionKeys.has(key)) {
      sectionKeys.add(key)
      sectionItems.push({ name: r.sectionName, program: r.sectionProgram })
    }
  }
  const { data: sections, created: createdSections } = await sectionRepository.upsertMany(sectionItems)
  result.createdSections = createdSections

  // ── Resolve users (batch lookup + batch create) ──
  const uniqueEmails = [...new Set(rows.map((r) => r.email.toLowerCase().trim()))]
  const userMap = await userRepository.findManyByEmail(uniqueEmails)
  const missingEmails = uniqueEmails.filter((e) => !userMap.has(e))
  if (missingEmails.length > 0) {
    const nameByEmail = new Map(rows.map((r) => [r.email.toLowerCase().trim(), r.name]))
    const createdUsers = await userRepository.createMany(
      missingEmails.map((email) => ({
        email,
        name: nameByEmail.get(email) || email.split("@")[0] || email,
        role: "FACULTY",
        departmentId: departmentId ?? undefined,
      })),
    )
    for (const [email, user] of createdUsers) {
      userMap.set(email, user)
    }
  }

  // ── Build mappings ──
  const fsItems: { faculty_id: string; subject_id: string; section_id: string }[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    const user = userMap.get(row.email.toLowerCase().trim())
    if (!user) {
      result.errors.push({ row: rowNum, email: row.email, message: "Faculty not found in system" })
      continue
    }

    const subject = subjects.get(row.subjectCode)
    if (!subject) {
      result.errors.push({ row: rowNum, message: `Subject "${row.subjectCode}" could not be created or found` })
      continue
    }

    const sectionKey = `${row.sectionName}|${row.sectionProgram}`
    const section = sections.get(sectionKey)
    if (!section) {
      result.errors.push({ row: rowNum, message: `Section "${row.sectionProgram}-${row.sectionName}" could not be created or found` })
      continue
    }

    fsItems.push({ faculty_id: user.id, subject_id: subject.id, section_id: section.id })
    result.matched++
  }

  // ── Group by section and replace ──
  const bySection = new Map<string, { faculty_id: string; subject_id: string }[]>()
  for (const item of fsItems) {
    if (!bySection.has(item.section_id)) bySection.set(item.section_id, [])
    bySection.get(item.section_id)!.push({ faculty_id: item.faculty_id, subject_id: item.subject_id })
  }

  for (const [section_id, items] of bySection) {
    await facultySubjectRepository.replaceBySection(section_id, items)
  }

  return result
}

// ── Student Enrollment CSV ───────────────────────────────
// Columns: student email, section (e.g., "BSIT-32A3")

interface StudentEnrollmentCsvRow {
  email: string
  name: string
  sectionName: string
  sectionProgram: string
}

export interface StudentEnrollmentImportResult {
  matched: number
  errors: { row: number; email?: string; message: string }[]
  createdSections: number
}

export function parseStudentEnrollmentCsv(text: string): {
  rows: StudentEnrollmentCsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: StudentEnrollmentCsvRow[] = []
  const errors: { row: number; message: string }[] = []

  if (lines.length === 0) {
    return { rows, errors, headerError: "CSV file is empty" }
  }

  const headerLine = lines[0]
  const rawHeaders = headerLine.split(",").map((h) => h.trim().toLowerCase())

  const hasName = rawHeaders.length > 1 && rawHeaders[1] === "name"
  const minCols = hasName ? 3 : 2

  if (rawHeaders.length < minCols) {
    return {
      rows,
      errors,
      headerError: `Expected at least ${minCols} columns (student email${hasName ? ", name" : ""}, section), got ${rawHeaders.length}.`,
    }
  }

  if (rawHeaders[0] !== "student email") {
    return {
      rows,
      errors,
      headerError: `Expected headers: student email${hasName ? ", name" : ""}, section — got: ${rawHeaders.join(", ")}`,
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.split(",").map((c) => c.trim())

    if (cols.length < minCols) {
      errors.push({ row: i + 1, message: `Expected at least ${minCols} columns, got ${cols.length}` })
      continue
    }

    const email = cols[0].toLowerCase().trim()
    const displayName = hasName ? cols[1].trim() : ""
    const sectionRaw = cols.slice(hasName ? 2 : 1).join(", ").trim()
    const { program, name: sectionName } = parseSectionIdentifier(sectionRaw)

    if (email.length === 0) {
      errors.push({ row: i + 1, message: "Student email is required" })
      continue
    }

    if (sectionName.length === 0) {
      errors.push({ row: i + 1, message: "Section is required" })
      continue
    }

    rows.push({ email, name: displayName, sectionName, sectionProgram: program })
  }

  return { rows, errors }
}

export async function importStudentEnrollments(
  rows: StudentEnrollmentCsvRow[],
): Promise<StudentEnrollmentImportResult> {
  const result: StudentEnrollmentImportResult = {
    matched: 0,
    errors: [],
    createdSections: 0,
  }

  if (rows.length === 0) return result

  // ── Upsert sections ──
  const sectionKeys = new Set<string>()
  const sectionItems: { name: string; program: string }[] = []
  for (const r of rows) {
    const key = `${r.sectionName}|${r.sectionProgram}`
    if (!sectionKeys.has(key)) {
      sectionKeys.add(key)
      sectionItems.push({ name: r.sectionName, program: r.sectionProgram })
    }
  }
  const { data: sections, created: createdSections } = await sectionRepository.upsertMany(sectionItems)
  result.createdSections = createdSections

  // ── Resolve users (batch lookup + batch create) ──
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
      })),
    )
    for (const [email, user] of createdUsers) {
      userMap.set(email, user)
    }
  }

  // ── Build enrollment items ──
  const enrollmentItems: { student_id: string; section_id: string }[] = []
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    const user = userMap.get(row.email.toLowerCase().trim())
    if (!user) {
      result.errors.push({ row: rowNum, email: row.email, message: "Student not found in system" })
      continue
    }

    const sectionKey = `${row.sectionName}|${row.sectionProgram}`
    const section = sections.get(sectionKey)
    if (!section) {
      result.errors.push({ row: rowNum, message: `Section "${row.sectionProgram}-${row.sectionName}" could not be created or found` })
      continue
    }

    enrollmentItems.push({ student_id: user.id, section_id: section.id })
    result.matched++
  }

  // ── Group by section and replace ──
  const bySection = new Map<string, { student_id: string }[]>()
  for (const item of enrollmentItems) {
    if (!bySection.has(item.section_id)) bySection.set(item.section_id, [])
    bySection.get(item.section_id)!.push({ student_id: item.student_id })
  }

  for (const [section_id, items] of bySection) {
    await studentEnrollmentRepository.replaceBySection(section_id, items)
  }

  return result
}
