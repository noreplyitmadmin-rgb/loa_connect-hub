"use client"

import { useState, useRef } from "react"
import SubmitButton from "@/components/SubmitButton"

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
  parseErrors: { row: number; message: string }[]
  createdSubjects?: number
  createdSections?: number
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

function UploadCard({ importType }: { importType: ImportType }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<CsvRow[] | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewError, setPreviewError] = useState("")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const info =
    importType === "faculty-subject"
      ? { title: "Import Faculty-Subject Mappings", description: "Upload a CSV linking faculty members to the subjects and sections they teach.", headers: "faculty email, subject code, section" }
      : { title: "Import Student Enrollments", description: "Upload a CSV listing which students belong to which sections.", headers: "student email, section" }

  const paginatedRows = previewRows
    ? previewRows.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE)
    : []
  const totalPreviewPages = previewRows ? Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE) : 0

  const handlePreview = async () => {
    setPreviewError("")
    setError("")
    setResult(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setPreviewError("Please select a CSV file"); return }

    const text = await file.text()
    const { rows, error: parseError } = parseClientCsv(text, importType)
    if (parseError) { setPreviewError(parseError); return }
    if (rows.length === 0) { setPreviewError("No valid rows found in CSV"); return }

    setPreviewRows(rows)
    setPreviewPage(0)
  }

  const handleConfirm = async () => {
    if (!previewRows || loading) return
    setError("")
    setResult(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setPreviewError("Please select a CSV file"); return }

    const formData = new FormData()
    formData.append("file", file)

    setLoading(true)
    try {
      const res = await fetch(ENDPOINTS[importType], { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Import failed"); return }
      setResult(data)
      setPreviewRows(null)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const columnHeaders = importType === "faculty-subject" ? ["Email", "Subject Code", "Section"] : ["Email", "Section"]
  const colCount = columnHeaders.length

  if (result) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-primary">{info.title}</h3>
        <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm space-y-2">
          <p className="font-medium text-primary">Import Result</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{result.matched}</p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Matched</p>
            </div>
            {result.createdSubjects !== undefined && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{result.createdSubjects}</p>
                <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Subjects</p>
              </div>
            )}
            {result.createdSections !== undefined && (
              <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                <p className="text-xl font-bold text-blue-600">{result.createdSections}</p>
                <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Sections</p>
              </div>
            )}
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold text-red-600">{result.errors.length + (result.parseErrors?.length ?? 0)}</p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Errors</p>
            </div>
          </div>
          {(result.errors.length > 0 || (result.parseErrors?.length ?? 0) > 0) && (
            <div className="text-xs text-red-600 space-y-0.5 max-h-32 overflow-y-auto">
              {[...result.parseErrors, ...result.errors].map((e, i) => (
                <p key={i}>Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setResult(null)}
          className="mt-3 text-xs font-semibold text-gold-600 hover:text-gold-800"
        >
          Import Another File
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-primary">{info.title}</h3>
      <p className="text-sm text-tertiary mt-1">{info.description}</p>

      {!previewRows && (
        <>
          <div className="mt-4">
            <p className="text-xs text-slate-500 mb-1">Expected CSV headers:</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-700">{info.headers}</code>
          </div>

          <button
            type="button"
            onClick={() => downloadTemplate(importType)}
            className="mt-2 text-xs font-semibold text-gold-600 hover:text-gold-800 flex items-center gap-1"
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
              className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100"
            />
            {previewError && <p className="text-sm text-red-600">{previewError}</p>}
            <SubmitButton onClick={handlePreview} loading={false}>
              Upload & Preview
            </SubmitButton>
          </div>
        </>
      )}

      {previewRows && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Preview — {previewRows.length} row{previewRows.length !== 1 ? "s" : ""}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreviewRows(null); setPreviewPage(0); setPreviewError("") }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading || previewRows.length === 0}
                onClick={handleConfirm}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {loading ? "Importing..." : `Confirm Import (${previewRows.length})`}
              </button>
            </div>
          </div>

          {error && <p className="text-xs font-medium text-red-600">{error}</p>}

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-slate-200 sticky top-0">
                  <th className="p-2 w-8">#</th>
                  {columnHeaders.map((h) => (
                    <th key={h} className="p-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, i) => (
                  <tr key={`${previewPage}-${i}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 text-tertiary">{r.row}</td>
                    <td className="p-2">{r.email}</td>
                    {importType === "faculty-subject" && <td className="p-2">{r.subjectCode}</td>}
                    <td className="p-2">{r.section}</td>
                  </tr>
                ))}
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
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={previewPage >= totalPreviewPages - 1}
                  onClick={() => setPreviewPage((p) => p + 1)}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
    </div>
  )
}
