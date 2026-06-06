"use client"

import { useState, useRef } from "react"
import SubmitButton from "@/components/SubmitButton"

interface StudentCsvRow {
  row: number
  email: string
  name: string
  subjectCode: string
  section: string
}

interface ImportResult {
  created: { name: string; email: string; role: string }[]
  enrolled: number
  failed: { row: number; email: string; subjectCode: string; section: string; remark: string }[]
  parseErrors: { row: number; message: string }[]
  successCsv: string
  failureCsv: string
  totalRows: number
}

const TEMPLATE_HEADERS = "name, email, subject code, section"
const TEMPLATE_SAMPLE = "Alice Student, alice.student@itmlyceumalabang.onmicrosoft.com, CS101, BSIT-32A3\nBob Martinez, bob.martinez@itmlyceumalabang.onmicrosoft.com, MATH201, BSCS-21B"

function downloadBlob(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function parseClientCsv(text: string): { rows: StudentCsvRow[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) return { rows: [], error: "CSV file is empty" }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())
  const expected = ["name", "email", "subject code", "section"]

  if (headers.length < expected.length) {
    return { rows: [], error: `Expected headers: ${expected.join(", ")}` }
  }
  for (let i = 0; i < expected.length; i++) {
    if (headers[i] !== expected[i]) {
      return { rows: [], error: `Expected header "${expected[i]}" at column ${i + 1}, got "${headers[i]}"` }
    }
  }

  const rows: StudentCsvRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim())
    if (cols.length < expected.length) continue
    rows.push({
      row: i + 1,
      name: cols[0],
      email: cols[1],
      subjectCode: cols[2],
      section: cols.slice(3).join(", "),
    })
  }
  return { rows }
}

const PREVIEW_PAGE_SIZE = 50

export default function BulkStudentImport({ departmentId }: { departmentId?: string | null }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<StudentCsvRow[] | null>(null)
  const [previewPage, setPreviewPage] = useState(0)
  const [previewError, setPreviewError] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importing, setImporting] = useState(false)

  const paginatedRows = previewRows
    ? previewRows.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE)
    : []
  const totalPreviewPages = previewRows ? Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE) : 0

  const handlePreview = async () => {
    setPreviewError("")
    setError("")
    const file = fileRef.current?.files?.[0]
    if (!file) { setPreviewError("Please select a CSV file"); return }
    const text = await file.text()
    const { rows, error: parseError } = parseClientCsv(text)
    if (parseError) { setPreviewError(parseError); return }
    if (rows.length === 0) { setPreviewError("No valid rows found in CSV"); return }
    setPreviewRows(rows)
    setPreviewPage(0)
  }

  const handleFieldChange = (index: number, field: "name" | "subjectCode" | "section", value: string) => {
    if (!previewRows) return
    const next = [...previewRows]
    next[index] = { ...next[index], [field]: value }
    setPreviewRows(next)
  }

  const handleRemoveRow = (index: number) => {
    if (!previewRows) return
    const next = previewRows.filter((_, i) => i !== index)
    setPreviewRows(next)
    if (next.length > 0 && Math.ceil(next.length / PREVIEW_PAGE_SIZE) <= previewPage) {
      setPreviewPage(Math.max(0, previewPage - 1))
    }
  }

  const handleConfirm = async () => {
    if (!previewRows || loading) return
    setError("")
    setImporting(true)
    setLoading(true)
    try {
      const res = await fetch("/api/import/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId,
          rows: previewRows.map((r) => ({
            email: r.email,
            name: r.name,
            subjectCode: r.subjectCode,
            section: r.section,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Import failed"); setImporting(false); return }
      setImportResult(data as ImportResult)
      setPreviewRows(null)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
      setImporting(false)
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

  const totalErrors = importResult
    ? importResult.failed.length + importResult.parseErrors.length
    : 0

  return (
    <>
      {importing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white dark:bg-surface-dim rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
            <div className="w-10 h-10 border-4 border-gold-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-secondary">Importing student enrollments...</p>
            <p className="text-xs text-tertiary">Please wait while we process your data.</p>
          </div>
        </div>
      )}

      {!previewRows && !importResult && (
        <div className="space-y-4">
          <div>
            <p className="text-xs text-tertiary mb-1">Expected CSV headers:</p>
            <code className="text-xs bg-surface-dim px-2 py-1 rounded text-secondary">{TEMPLATE_HEADERS}</code>
          </div>

          <button
            type="button"
            onClick={() => downloadBlob(`${TEMPLATE_HEADERS}\n${TEMPLATE_SAMPLE}`, "student-import-template.csv")}
            className="text-xs font-semibold text-gold-600 hover:text-gold-700 flex items-center gap-1"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </button>

          <div className="space-y-3">
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
        </div>
      )}

      {previewRows && (
        <div className="space-y-3">
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
                  <th className="p-2">Email</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Subject Code</th>
                  <th className="p-2">Section</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, i) => {
                  const absIdx = previewPage * PREVIEW_PAGE_SIZE + i
                  return (
                    <tr key={`${previewPage}-${i}`} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 text-tertiary">{r.row}</td>
                      <td className="p-2 text-secondary text-[11px]">{r.email}</td>
                      <td className="p-2">
                        <input
                          value={r.name}
                          onChange={(e) => handleFieldChange(absIdx, "name", e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-default focus:border-gold-500 rounded px-1 py-0.5 outline-none text-[11px]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={r.subjectCode}
                          onChange={(e) => handleFieldChange(absIdx, "subjectCode", e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-default focus:border-gold-500 rounded px-1 py-0.5 outline-none text-[11px]"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          value={r.section}
                          onChange={(e) => handleFieldChange(absIdx, "section", e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-default focus:border-gold-500 rounded px-1 py-0.5 outline-none text-[11px]"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveRow(absIdx)}
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
                Showing {previewPage * PREVIEW_PAGE_SIZE + 1} to {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewRows.length)} of {previewRows.length}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={previewPage === 0}
                  onClick={() => setPreviewPage((p) => p - 1)}
                  className="px-2.5 py-1.5 bg-surface-hover text-secondary rounded-lg text-xs font-semibold hover:bg-surface-dim disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={previewPage >= totalPreviewPages - 1}
                  onClick={() => setPreviewPage((p) => p + 1)}
                  className="px-2.5 py-1.5 bg-surface-hover text-secondary rounded-lg text-xs font-semibold hover:bg-surface-dim disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">{importResult.created.length}</p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Created</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-blue-600">{importResult.enrolled}</p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Enrolled</p>
            </div>
            <div className="card p-3 text-center">
              <p className={`text-xl font-bold ${totalErrors > 0 ? "text-red-600" : "text-tertiary"}`}>{totalErrors}</p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Errors</p>
            </div>
          </div>

          {importResult.parseErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Parse Errors ({importResult.parseErrors.length})</p>
              {importResult.parseErrors.map((e, i) => (
                <p key={`pe-${i}`} className="text-xs text-red-600">Row {e.row}: {e.message}</p>
              ))}
            </div>
          )}

          {importResult.failed.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider">Import Failures ({importResult.failed.length})</p>
              {importResult.failed.map((f, i) => (
                <p key={`f-${i}`} className="text-xs text-amber-700">Row {f.row}: {f.email} — {f.remark}</p>
              ))}
            </div>
          )}

          {totalErrors === 0 && importResult.enrolled > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <p className="text-xs font-semibold text-emerald-700">All {importResult.totalRows} rows processed successfully.</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {importResult.successCsv && (
              <button
                type="button"
                onClick={() => downloadBlob(importResult.successCsv, "import-successes.csv")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Successes (.csv)
              </button>
            )}
            {importResult.failureCsv && (
              <button
                type="button"
                onClick={() => downloadBlob(importResult.failureCsv, "import-failures.csv")}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Failures (.csv)
              </button>
            )}
          </div>

          <button type="button" onClick={handleReset} className="text-xs font-semibold text-gold-600 hover:text-gold-800 underline">
            Import Another File
          </button>
        </div>
      )}
    </>
  )
}
