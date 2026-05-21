export interface CsvRow {
  name: string
  email: string
  department: string | null
  isDean: boolean
  course: string | null
}

export interface CsvParseResult {
  rows: CsvRow[]
  errors: { row: number; message: string }[]
  headerError?: string
}

export type CsvTemplateType = "full" | "students"

const HEADERS: Record<CsvTemplateType, string[]> = {
  full: ["name", "microsoft email", "department", "dean"],
  students: ["name", "microsoft email", "course"],
}

const ALLOWED_DOMAIN = "@itmlyceumalabang.onmicrosoft.com"

export function getCsvTemplate(type: CsvTemplateType): string {
  return HEADERS[type].join(",") + "\n"
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

    if (!email.endsWith(ALLOWED_DOMAIN)) {
      errors.push({ row: i + 1, message: `Email "${email}" must end with ${ALLOWED_DOMAIN}` })
      continue
    }

    if (name.length === 0) {
      errors.push({ row: i + 1, message: "Name is required" })
      continue
    }

    const department = templateType === "full" ? (cols[2]?.trim() || null) : null
    const isDean = templateType === "full" ? (cols[3]?.trim().toLowerCase() === "true") : false
    const course = templateType === "students" ? (cols[2]?.trim() || null) : null

    rows.push({ name, email, department, isDean, course })
  }

  return { rows, errors }
}
