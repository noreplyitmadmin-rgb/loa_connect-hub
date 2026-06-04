export interface CsvRow {
  name: string
  email: string
  department: string | null
  course: string | null
  employeeNo: string | null
  subject: string | null
  section: string | null
  code: string | null
  title: string | null
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
}

export type CsvTemplateType = "full" | "students"

const HEADERS: Record<CsvTemplateType, string[]> = {
  full: ["name", "microsoft email", "section", "code", "title"],
  students: ["name", "microsoft email", "section", "code"],
}

const ALLOWED_DOMAIN = "@itmlyceumalabang.onmicrosoft.com"
const ALLOWED_FACULTY_DOMAIN = "@lyceumalabang.edu.ph"

export function getCsvTemplate(type: CsvTemplateType): string {
  const headers = HEADERS[type].join(",")
  const samples: Record<CsvTemplateType, string[]> = {
    full: [
      "Jane Faculty,jane.faculty@lyceumalabang.edu.ph,BSIT-32A1,ELEC-323,Elective 3 - Fullstack Development",
      "Mike Dean,mike.dean@lyceumalabang.edu.ph,BSCS-41B2,CCS-412,Capstone Project 2",
    ],
    students: [
      "Alice Student,alice.student@itmlyceumalabang.onmicrosoft.com,BSIT-32A1,ELEC-323",
      "Bob Martinez,bob.martinez@itmlyceumalabang.onmicrosoft.com,BSCS-41B2,CCS-412",
    ],
  }
  return headers + "\n" + samples[type].join("\n") + "\n"
}

export function parseCsv(text: string, templateType: CsvTemplateType): CsvParseResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  const rows: CsvRow[] = []
  const errors: { row: number; message: string }[] = []

  if (lines.length === 0) {
    return { rows, errors, headerError: "CSV file is empty" }
  }

  // Validate headers
  const headerLine = lines[0]
  const rawHeaders = headerLine.split(",").map((h) => h.trim().toLowerCase())
  const expected = HEADERS[templateType]

  if (rawHeaders.length !== expected.length) {
    return {
      rows,
      errors,
      headerError: `Expected ${expected.length} column(s) (${expected.join(", ")}), got ${rawHeaders.length}.`,
    }
  }

  for (let i = 0; i < expected.length; i++) {
    if (rawHeaders[i] !== expected[i]) {
      return {
        rows,
        errors,
        headerError: `Column ${i + 1} should be "${expected[i]}" but got "${rawHeaders[i]}". Expected headers: ${expected.join(", ")}`,
      }
    }
  }

  // Parse data rows (skip header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    const cols = line.split(",").map((c) => c.trim())

    if (cols.length < expected.length) {
      errors.push({ row: i + 1, message: `Expected ${expected.length} columns, got ${cols.length}` })
      continue
    }

    const name = cols[0]
    const email = cols[1].toLowerCase().trim()

    if (!email.endsWith(ALLOWED_DOMAIN) && !email.endsWith(ALLOWED_FACULTY_DOMAIN)) {
      errors.push({ row: i + 1, message: `Email "${email}" must end with ${ALLOWED_DOMAIN} or ${ALLOWED_FACULTY_DOMAIN}` })
      continue
    }

    if (name.length === 0) {
      errors.push({ row: i + 1, message: "Name is required" })
      continue
    }

    const department = null
    const course = null
    const employeeNo = null
    let section: string | null = null
    let code: string | null = null
    let title: string | null = null
    let subject: string | null = null

    if (templateType === "full") {
      section = cols[2]?.trim() || null
      code = cols[3]?.trim() || null
      title = cols.slice(4).join(", ").trim() || null
      subject = code
    } else if (templateType === "students") {
      section = cols[2]?.trim() || null
      code = cols[3]?.trim() || null
      subject = code
    }

    rows.push({ name, email, department, course, employeeNo, subject, section, code, title })
  }

  return { rows, errors }
}
