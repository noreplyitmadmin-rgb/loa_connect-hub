"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import SubmitButton from "@/components/SubmitButton"

interface MappedFaculty {
  id: string
  faculty: { id: string; name: string; email: string }
  subject: { id: string; code: string; name: string }
  section: { id: string; name: string; program: string }
}

interface MappedStudent {
  id: string
  student: { id: string; name: string; email: string }
  section: { id: string; name: string; program: string }
}

type ImportType = "faculty-subject" | "student-enrollment"

interface CsvRow {
  row: number
  email: string
  subjectCode: string
  section: string
}

interface ImportResult {
  matched: number
  errors: { row: number; email?: string; message: string }[]
  createdSubjects?: number
  createdSections: number
  parseErrors?: { row: number; message: string }[]
}

const ENDPOINTS: Record<ImportType, string> = {
  "faculty-subject": "/api/import/evaluation-faculty",
  "student-enrollment": "/api/import/evaluation-student",
}

const TEMPLATES: Record<ImportType, { headers: string; sample: string }> = {
  "faculty-subject": {
    headers: "faculty email, subject code, section",
    sample: "juan.delacruz@example.com, CS101, BSIT-32A3\nmaria.santos@example.com, MATH201, BSCS-21B",
  },
  "student-enrollment": {
    headers: "student email, section",
    sample: "ana.reyes@example.com, BSIT-32A3\npedro.cruz@example.com, BSCS-21B",
  },
}

function downloadTemplate(importType: ImportType) {
  const t = TEMPLATES[importType]
  const csv = `${t.headers}\n${t.sample}`
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${importType}-template.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function parseClientCsv(text: string, importType: ImportType): { rows: CsvRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], error: "CSV file is empty" }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const expected =
    importType === "faculty-subject"
      ? ["faculty email", "subject code", "section"]
      : ["student email", "section"]

  if (headers.length < expected.length) {
    return { rows: [], error: `Expected headers: ${expected.join(", ")}` }
  }
  for (let i = 0; i < expected.length; i++) {
    if (headers[i] !== expected[i]) {
      return { rows: [], error: `Expected header "${expected[i]}" at column ${i + 1}, got "${headers[i]}"` }
    }
  }

  const rows: CsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    if (cols.length < expected.length) continue

    if (importType === "faculty-subject") {
      rows.push({ row: i + 1, email: cols[0], subjectCode: cols[1], section: cols.slice(2).join(", ") })
    } else {
      rows.push({ row: i + 1, email: cols[0], subjectCode: "", section: cols[1] })
    }
  }

  return { rows }
}

const PREVIEW_PAGE_SIZE = 50

function ImportResultCard({ result, importType, onReset }: { result: ImportResult; importType: ImportType; onReset: () => void }) {
  const totalErrors = (result.errors?.length || 0) + (result.parseErrors?.length || 0)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-emerald-600">{result.matched}</p>
          <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Matched</p>
        </div>
        {importType === "faculty-subject" && (
          <div className="card p-3 text-center">
            <p className="text-xl font-bold text-gold-600">{result.createdSubjects ?? 0}</p>
            <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">New Subjects</p>
          </div>
        )}
        <div className="card p-3 text-center">
          <p className="text-xl font-bold text-gold-600">{result.createdSections}</p>
          <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">New Sections</p>
        </div>
        <div className="card p-3 text-center">
          <p className={`text-xl font-bold ${totalErrors > 0 ? "text-red-600" : "text-tertiary"}`}>{totalErrors}</p>
          <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Errors</p>
        </div>
      </div>

      {result.parseErrors && result.parseErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Parse Errors ({result.parseErrors.length})</p>
          {result.parseErrors.map((e, i) => (
            <p key={`pe-${i}`} className="text-xs text-red-600">Row {e.row}: {e.message}</p>
          ))}
        </div>
      )}

      {result.errors && result.errors.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
          <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Import Errors ({result.errors.length})</p>
          {result.errors.map((e, i) => (
            <p key={`e-${i}`} className="text-xs text-amber-700">Row {e.row}: {e.email ? `${e.email} — ` : ""}{e.message}</p>
          ))}
        </div>
      )}

      {totalErrors === 0 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-xs font-semibold text-emerald-700">All {result.matched} row{result.matched !== 1 ? "s" : ""} imported successfully.</p>
        </div>
      )}

      <button type="button" onClick={onReset} className="text-xs font-semibold text-gold-600 hover:text-gold-800 underline">
        Import Another File
      </button>
    </div>
  )
}

function UploadCard({ importType }: { importType: ImportType }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<CsvRow[] | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewError, setPreviewError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [importResult, setImportResult] = useState<ImportResult | null>(null)

  const info =
    importType === "faculty-subject"
      ? { title: "Import Faculty-Subject Mappings", description: "Upload a CSV linking faculty members to the subjects and sections they teach.", headers: "faculty email, subject code, section" }
      : { title: "Import Student Enrollments", description: "Upload a CSV listing which students belong to which sections.", headers: "student email, section" }

  const paginatedRows = previewRows
    ? previewRows.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE)
    : []
  const totalPreviewPages = previewRows ? Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE) : 0
  const columnHeaders =
    importType === "faculty-subject"
      ? ["Email", "Subject Code", "Section"]
      : ["Email", "Section"]

  const handlePreview = async () => {
    setPreviewError("")
    setError("")

    const file = fileRef.current?.files?.[0]
    if (!file) { setPreviewError("Please select a CSV file"); return }

    const text = await file.text()
    const { rows, error: parseError } = parseClientCsv(text, importType)
    if (parseError) { setPreviewError(parseError); return }
    if (rows.length === 0) { setPreviewError("No valid rows found in CSV"); return }

    setPreviewRows(rows)
    setPreviewPage(0)
  }

  const handleRemoveRow = (index: number) => {
    if (!previewRows) return
    const next = previewRows.filter((_, i) => i !== index)
    setPreviewRows(next)
    if (next.length > 0 && Math.ceil(next.length / PREVIEW_PAGE_SIZE) <= previewPage) {
      setPreviewPage(Math.max(0, previewPage - 1))
    }
  }

  const handleFieldChange = (index: number, field: "subjectCode" | "section", value: string) => {
    if (!previewRows) return
    const next = [...previewRows]
    next[index] = { ...next[index], [field]: value }
    setPreviewRows(next)
  }

  const handleConfirm = async () => {
    if (!previewRows || loading) return
    setError("")

    const body = {
      rows: previewRows.map((r) => ({
        email: r.email,
        subjectCode: r.subjectCode,
        section: r.section,
      })),
    }

    setLoading(true)
    try {
      const res = await fetch(ENDPOINTS[importType], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Import failed"); return }
      setImportResult(data as ImportResult)
      setPreviewRows(null)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setImportResult(null)
    setPreviewRows(null)
    setPreviewPage(0)
    setPreviewError("")
    setError("")
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-semibold text-primary">{info.title}</h3>
      <p className="text-sm text-tertiary mt-1">{info.description}</p>

      {/* Step 1: File selection */}
      {!previewRows && !importResult && (
        <>
          <div className="mt-4">
            <p className="text-xs text-tertiary mb-1">Expected CSV headers:</p>
            <code className="text-xs bg-surface-dim px-2 py-1 rounded text-secondary">{info.headers}</code>
          </div>

          <button
            type="button"
            onClick={() => downloadTemplate(importType)}
            className="mt-2 text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>

          <div className="mt-3 space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-tertiary file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
            />
            {previewError && <p className="text-sm text-red-600">{previewError}</p>}
            <SubmitButton onClick={handlePreview} loading={false}>
              Upload & Preview
            </SubmitButton>
          </div>
        </>
      )}

      {/* Step 2: Preview */}
      {previewRows && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Preview — {previewRows.length} row{previewRows.length !== 1 ? "s" : ""}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || previewRows.length === 0}
                onClick={handleConfirm}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gold-600 text-white hover:bg-gold-700 disabled:opacity-50"
              >
                {loading ? "Importing..." : `Confirm Import (${previewRows.length})`}
              </button>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-default rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                  <th className="p-2 w-8">#</th>
                  {columnHeaders.map((h) => (
                    <th key={h} className="p-2">{h}</th>
                  ))}
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, i) => {
                  const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                  return (
                    <tr key={`${previewPage}-${i}`} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 text-tertiary">{r.row}</td>
                      <td className="p-2 text-secondary text-[11px]">{r.email}</td>
                      {importType === "faculty-subject" && (
                        <td className="p-2">
                          <input
                            value={r.subjectCode}
                            onChange={(e) => handleFieldChange(absoluteIndex, "subjectCode", e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-default focus:border-gold-500 rounded px-1 py-0.5 outline-none text-[11px]"
                          />
                        </td>
                      )}
                      <td className="p-2">
                        <input
                          value={r.section}
                          onChange={(e) => handleFieldChange(absoluteIndex, "section", e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-default focus:border-gold-500 rounded px-1 py-0.5 outline-none text-[11px]"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(absoluteIndex)}
                          className="text-red-400 hover:text-red-600 transition-colors"
                          title="Remove row"
                        >
                          <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {totalPreviewPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs font-medium text-tertiary">
                Showing {previewPage * PREVIEW_PAGE_SIZE + 1} to {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewRows.length)} of {previewRows.length} rows
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={previewPage === 0}
                  onClick={() => setPreviewPage((p) => p - 1)}
                  className="px-2.5 py-1.5 bg-surface-hover text-secondary rounded-lg text-xs font-semibold hover:bg-surface-dim disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={previewPage >= totalPreviewPages - 1}
                  onClick={() => setPreviewPage((p) => p + 1)}
                  className="px-2.5 py-1.5 bg-surface-hover text-secondary rounded-lg text-xs font-semibold hover:bg-surface-dim disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Results */}
      {importResult && (
        <div className="mt-4">
          <ImportResultCard result={importResult} importType={importType} onReset={handleReset} />
        </div>
      )}
    </div>
  )
}

function ViewMappings() {
  const [tab, setTab] = useState<"faculty" | "student">("faculty")
  const [facultyData, setFacultyData] = useState<MappedFaculty[] | null>(null)
  const [studentData, setStudentData] = useState<MappedStudent[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [facultySearch, setFacultySearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [facultyRes, studentRes] = await Promise.all([
        fetch("/api/data/evaluation-mappings?type=faculty"),
        fetch("/api/data/evaluation-mappings?type=student"),
      ])
      if (!facultyRes.ok) throw new Error("Failed to load faculty mappings")
      if (!studentRes.ok) throw new Error("Failed to load student enrollments")
      const [facultyJson, studentJson] = await Promise.all([facultyRes.json(), studentRes.json()])
      setFacultyData(facultyJson.data)
      setStudentData(studentJson.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredFaculty = facultyData?.filter((m) => {
    if (!facultySearch) return true
    const q = facultySearch.toLowerCase()
    return (
      m.faculty.email.toLowerCase().includes(q) ||
      m.faculty.name.toLowerCase().includes(q) ||
      m.subject.code.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q)
    )
  })

  const filteredStudents = studentData?.filter((m) => {
    if (!studentSearch) return true
    const q = studentSearch.toLowerCase()
    return (
      m.student.email.toLowerCase().includes(q) ||
      m.student.name.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q)
    )
  })

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-primary">Current Mappings</h3>
        <button
          type="button"
          onClick={fetchData}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {error && <p className="text-xs font-medium text-red-600 mb-3">{error}</p>}

      <div className="flex gap-1 mb-4 border-b border-default">
        <button
          type="button"
          onClick={() => setTab("faculty")}
          className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${
            tab === "faculty" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
          }`}
        >
          Faculty-Subject ({facultyData?.length ?? "..."})
        </button>
        <button
          type="button"
          onClick={() => setTab("student")}
          className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${
            tab === "student" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
          }`}
        >
          Student Enrollments ({studentData?.length ?? "..."})
        </button>
      </div>

      {tab === "faculty" && (
        <div className="space-y-3">
          <input
            type="text"
            value={facultySearch}
            onChange={(e) => setFacultySearch(e.target.value)}
            placeholder="Search by faculty name, email, subject code, or section..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
          />
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                  <th className="p-2">Faculty</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Subject</th>
                  <th className="p-2">Section</th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty?.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-xs text-tertiary">No mappings found.</td></tr>
                ) : (
                  filteredFaculty?.map((m) => (
                    <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 font-medium text-secondary">{m.faculty.name}</td>
                      <td className="p-2 text-tertiary">{m.faculty.email}</td>
                      <td className="p-2">
                        <span className="font-medium text-secondary">{m.subject.code}</span>
                        <span className="text-tertiary ml-1">{m.subject.name}</span>
                      </td>
                      <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "student" && (
        <div className="space-y-3">
          <input
            type="text"
            value={studentSearch}
            onChange={(e) => setStudentSearch(e.target.value)}
            placeholder="Search by student name, email, or section..."
            className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
          />
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                  <th className="p-2">Student</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Section</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents?.length === 0 ? (
                  <tr><td colSpan={3} className="p-4 text-center text-xs text-tertiary">No enrollments found.</td></tr>
                ) : (
                  filteredStudents?.map((m) => (
                    <tr key={m.id} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 font-medium text-secondary">{m.student.name}</td>
                      <td className="p-2 text-tertiary">{m.student.email}</td>
                      <td className="p-2 text-secondary">{m.section.program}-{m.section.name}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EtlHubPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">ETL Hub</h1>
        <p className="text-sm text-tertiary mt-1">
          Upload CSV files to import evaluation data into the system.
        </p>
      </div>

      <UploadCard importType="faculty-subject" />
      <UploadCard importType="student-enrollment" />
      <ViewMappings />
    </div>
  )
}
