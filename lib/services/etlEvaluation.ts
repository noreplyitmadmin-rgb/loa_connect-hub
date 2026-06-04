import { supabase } from "@/lib/supabase"
import { userRepository, subjectRepository, facultySubjectRepository, studentEnrollmentRepository } from "@/lib/repositories/factory"

interface EvalCsvRow {
  name: string
  email: string
  subject: string
}

export interface EtlEvaluationResult {
  matched: number
  skipped: { row: number; email: string; reason: string }[]
  errors: { row: number; email?: string; message: string }[]
  subjectErrors: { row: number; subject: string; message: string }[]
  createdSubjects: number
}

export async function importEvaluationFaculty(
  rows: EvalCsvRow[],
  periodId: string,
): Promise<EtlEvaluationResult> {
  const result: EtlEvaluationResult = {
    matched: 0,
    skipped: [],
    errors: [],
    subjectErrors: [],
    createdSubjects: 0,
  }

  const subjectNames = [...new Set(rows.map((r) => r.subject.trim()))]
  const subjects = await subjectRepository.upsertMany(periodId, subjectNames)
  const createdSubjects = subjectNames.length - (subjectNames.filter((n) => subjects.has(n)).length ? 0 : 0)
  result.createdSubjects = createdSubjects

  const facultySubjectItems: { facultyId: string; subjectId: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      const user = await userRepository.findByEmail(row.email.trim())
      if (!user) {
        result.errors.push({ row: rowNum, email: row.email, message: "Faculty not found in system" })
        continue
      }

      const subject = subjects.get(row.subject.trim())
      if (!subject) {
        result.subjectErrors.push({ row: rowNum, subject: row.subject, message: "Subject could not be created" })
        continue
      }

      facultySubjectItems.push({ facultyId: user.id, subjectId: subject.id })
      result.matched++
    } catch (err) {
      result.errors.push({ row: rowNum, email: row.email, message: `Error: ${(err as Error).message}` })
    }
  }

  await facultySubjectRepository.replaceAll(periodId, facultySubjectItems)
  return result
}

export async function importEvaluationStudents(
  rows: EvalCsvRow[],
  periodId: string,
): Promise<EtlEvaluationResult> {
  const result: EtlEvaluationResult = {
    matched: 0,
    skipped: [],
    errors: [],
    subjectErrors: [],
    createdSubjects: 0,
  }

  const { data: existingSubjects, error: subjErr } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("periodId", periodId)
  if (subjErr) throw subjErr

  const subjectMap = new Map<string, string>()
  for (const s of existingSubjects || []) {
    subjectMap.set(s.name, s.id)
  }

  const enrollmentItems: { studentId: string; subjectId: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1

    try {
      const user = await userRepository.findByEmail(row.email.trim())
      if (!user) {
        result.errors.push({ row: rowNum, email: row.email, message: "Student not found in system" })
        continue
      }

      const subjectId = subjectMap.get(row.subject.trim())
      if (!subjectId) {
        result.subjectErrors.push({
          row: rowNum,
          subject: row.subject,
          message: "Subject not found — must be imported via Faculty CSV first",
        })
        continue
      }

      enrollmentItems.push({ studentId: user.id, subjectId })
      result.matched++
    } catch (err) {
      result.errors.push({ row: rowNum, email: row.email, message: `Error: ${(err as Error).message}` })
    }
  }

  await studentEnrollmentRepository.replaceAll(periodId, enrollmentItems)
  return result
}

export function parseEvalCsv(text: string): {
  rows: EvalCsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: EvalCsvRow[] = []
  const errors: { row: number; message: string }[] = []

  if (lines.length === 0) {
    return { rows, errors, headerError: "CSV file is empty" }
  }

  const headerLine = lines[0]
  const rawHeaders = headerLine.split(",").map((h) => h.trim().toLowerCase())

  if (rawHeaders.length < 3) {
    return {
      rows,
      errors,
      headerError: `Expected at least 3 columns (name, microsoft email, subject), got ${rawHeaders.length}.`,
    }
  }

  if (rawHeaders[0] !== "name" || rawHeaders[1] !== "microsoft email") {
    return {
      rows,
      errors,
      headerError: `Expected headers: name, microsoft email, subject — got: ${rawHeaders.join(", ")}`,
    }
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.split(",").map((c) => c.trim())

    if (cols.length < 3) {
      errors.push({ row: i + 1, message: `Expected at least 3 columns, got ${cols.length}` })
      continue
    }

    const name = cols[0]
    const email = cols[1].toLowerCase().trim()
    const subject = cols.slice(2).join(", ").trim()

    if (name.length === 0) {
      errors.push({ row: i + 1, message: "Name is required" })
      continue
    }

    if (email.length === 0) {
      errors.push({ row: i + 1, message: "Email is required" })
      continue
    }

    if (subject.length === 0) {
      errors.push({ row: i + 1, message: "Subject is required" })
      continue
    }

    rows.push({ name, email, subject })
  }

  return { rows, errors }
}
