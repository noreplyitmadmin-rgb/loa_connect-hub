"use client"

import { useRef, useState } from "react"

export interface Department {
  id: string
  name: string
  code: string
}

interface PreviewRow {
  row: number
  name: string
  email: string
  section: string
  code: string
  title: string
  course: string
  emailExists: boolean
  existingName: string | null
}

interface BulkImportUsersProps {
  departments: Department[]
}

export default function BulkImportUsers({ departments }: BulkImportUsersProps) {
  const [importType, setImportType] = useState<"users" | "students">("users")
  const [importDept, setImportDept] = useState("")
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewRows, setPreviewRows] = useState<PreviewRow[] | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState("")
  const [previewPage, setPreviewPage] = useState(0)
  const previewAbortRef = useRef<AbortController | null>(null)
  
  const PREVIEW_PAGE_SIZE = 50
  const paginatedRows = previewRows ? previewRows.slice(previewPage * PREVIEW_PAGE_SIZE, (previewPage + 1) * PREVIEW_PAGE_SIZE) : []
  const totalPreviewPages = previewRows ? Math.ceil(previewRows.length / PREVIEW_PAGE_SIZE) : 0

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
      {/* Step 1: Configuration & CSV Upload */}
      {!previewRows && !importResult && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-tertiary mb-1.5">
                Import Type
              </label>
              <select
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value as "users" | "students")
                  setImportResult(null)
                  setImportError("")
                  setPreviewRows(null)
                }}
                className="input text-sm w-full"
              >
                <option value="users">Faculty / Staff</option>
                <option value="students">Students</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-tertiary mb-1.5">
                Department
              </label>
              <select
                value={importDept}
                onChange={(e) => setImportDept(e.target.value)}
                className="input text-sm w-full"
              >
                <option value="">— Select Department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-secondary">Expected CSV Format</span>
              <a
                href={`/api/import/${importType}`}
                download={`import_${importType}_template.csv`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Template
              </a>
            </div>
            <p className="text-[10px] font-mono text-slate-500">
              {importType === "users" ? "name, microsoft email, section, code, title" : "name, microsoft email, section, code"}
            </p>
            <p className="text-[10px] font-mono text-slate-700">
              {importType === "users"
                ? "Jane Faculty, jane.faculty@lyceumalabang.edu.ph, BSIT-32A1, ELEC-323, Elective 3 - Fullstack Development"
                : "Alice Student, alice.student@itmlyceumalabang.onmicrosoft.com, BSIT-32A1, ELEC-323"}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-tertiary mb-1.5">
              CSV File
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="block w-full text-sm text-tertiary file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          {importError && <p className="text-xs font-medium text-red-600">{importError}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={previewLoading}
              onClick={async () => {
                setPreviewError("")
                setImportError("")
                if (!importDept) { setImportError("Please select a Department first"); return }
                const file = fileRef.current?.files?.[0]
                if (!file) { setImportError("Please select a CSV file"); return }
                const formData = new FormData()
                formData.append("file", file)
                formData.append("type", importType === "users" ? "full" : "students")
                
                const controller = new AbortController()
                previewAbortRef.current = controller
                
                setPreviewLoading(true)
                try {
                  const res = await fetch("/api/import/preview", { 
                    method: "POST", 
                    body: formData,
                    signal: controller.signal
                  })
                  const data = await res.json()
                  if (!res.ok) { setPreviewError(data.error || "Preview failed"); return }
                  setPreviewRows(data.rows.map((r: PreviewRow, i: number) => ({ ...r, row: i + 2 })))
                  setPreviewPage(0)
                } catch (e: unknown) {
                  if (e instanceof Error && e.name === 'AbortError') {
                    setPreviewError("Preview cancelled")
                  } else {
                    setPreviewError("Network error")
                  }
                } finally {
                  setPreviewLoading(false)
                  previewAbortRef.current = null
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {previewLoading ? "Parsing..." : "Preview"}
            </button>
            {previewLoading && (
              <button
                type="button"
                onClick={() => {
                  previewAbortRef.current?.abort()
                }}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Preview Table */}
      {previewRows && !importResult && (
        <div className="border-t border-slate-100 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">
              Preview — {previewRows.length} row{previewRows.length !== 1 ? "s" : ""}
            </h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setPreviewRows(null); setPreviewError(""); setPreviewPage(0); }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
              >
                Back
              </button>
              <button
                type="button"
                disabled={importLoading}
                onClick={async () => {
                  setImportLoading(true)
                  setImportError("")
                  try {
                    const res = await fetch(
                      importType === "users" ? "/api/import/users" : "/api/import/students",
                      {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          rows: previewRows.map((r) => ({
                            name: r.name,
                            email: r.email,
                            department: importDept || null,
                            course: null,
                            employeeNo: null,
                            subject: r.code || null,
                            section: r.section || null,
                            code: r.code || null,
                            title: importType === "users" ? r.title : null,
                          })),
                        }),
                      }
                    )
                    const data = await res.json()
                    if (!res.ok) { setImportError(data.error || "Import failed"); return }
                    setImportResult(data)
                    setPreviewRows(null)
                  } catch {
                    setImportError("Network error")
                  } finally {
                    setImportLoading(false)
                  }
                }}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {importLoading ? "Importing..." : `Confirm Import (${previewRows.length})`}
              </button>
            </div>
          </div>

          {previewError && <p className="text-xs font-medium text-red-600">{previewError}</p>}

          <div className="overflow-x-auto max-h-80 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-slate-50 text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-slate-200 sticky top-0">
                  <th className="p-2 w-8">#</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Section</th>
                  <th className="p-2">{importType === "users" ? "Code" : "Subject Code"}</th>
                  {importType === "users" && <th className="p-2">Title</th>}
                  <th className="p-2 w-24 text-center">Status</th>
                  <th className="p-2 w-12 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((r, i) => (
                  <tr key={`${previewPage}-${i}`} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-2 text-tertiary">{r.row}</td>
                    <td className="p-2">
                      <input
                        value={r.name}
                        onChange={(e) => {
                          const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                          const next = [...previewRows]
                          next[absoluteIndex] = { ...next[absoluteIndex], name: e.target.value }
                          setPreviewRows(next)
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={r.email}
                        onChange={(e) => {
                          const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                          const next = [...previewRows]
                          next[absoluteIndex] = { ...next[absoluteIndex], email: e.target.value }
                          setPreviewRows(next)
                        }}
                        className={`w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none ${
                          r.emailExists ? "text-amber-700" : ""
                        }`}
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={r.section}
                        onChange={(e) => {
                          const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                          const next = [...previewRows]
                          next[absoluteIndex] = { ...next[absoluteIndex], section: e.target.value }
                          setPreviewRows(next)
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={r.code}
                        onChange={(e) => {
                          const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                          const next = [...previewRows]
                          next[absoluteIndex] = { ...next[absoluteIndex], code: e.target.value }
                          setPreviewRows(next)
                        }}
                        className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none"
                      />
                    </td>
                    {importType === "users" && (
                      <td className="p-2">
                        <input
                          value={r.title}
                          onChange={(e) => {
                            const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                            const next = [...previewRows]
                            next[absoluteIndex] = { ...next[absoluteIndex], title: e.target.value }
                            setPreviewRows(next)
                          }}
                          className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-blue-400 rounded px-1 py-0.5 outline-none"
                        />
                      </td>
                    )}
                    <td className="p-2 text-center">
                      {r.emailExists ? (
                        <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded" title={`Existing user: ${r.existingName || ""}`}>
                          EXISTS
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          NEW
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          const absoluteIndex = previewPage * PREVIEW_PAGE_SIZE + i
                          const next = [...previewRows]
                          next.splice(absoluteIndex, 1)
                          setPreviewRows(next)
                          if (next.length > 0 && Math.ceil(next.length / PREVIEW_PAGE_SIZE) <= previewPage) {
                            setPreviewPage(Math.max(0, previewPage - 1))
                          }
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Remove row"
                      >
                        <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPreviewPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs font-medium text-tertiary">
                Showing {previewPage * PREVIEW_PAGE_SIZE + 1} to {Math.min((previewPage + 1) * PREVIEW_PAGE_SIZE, previewRows.length)} of {previewRows.length} rows
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  disabled={previewPage === 0}
                  onClick={() => setPreviewPage(p => p - 1)}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={previewPage >= totalPreviewPages - 1}
                  onClick={() => setPreviewPage(p => p + 1)}
                  className="px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Import Results */}
      {importResult && (
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-secondary uppercase tracking-wider">Results</h4>
            <button
              type="button"
              onClick={() => { setImportResult(null); setPreviewRows(null) }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Import Again
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold text-emerald-600">
                {(importResult as Record<string, unknown[]>).created?.length ??
                 (importResult as Record<string, number>).matched ?? 0}
              </p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">
                {(importResult as Record<string, unknown[]>).created ? "Created" : "Matched"}
              </p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold text-amber-600">
                {(importResult as Record<string, unknown[]>).skipped?.length ?? 0}
              </p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Skipped</p>
            </div>
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xl font-bold text-red-600">
                {((importResult as Record<string, unknown[]>).errors?.length ?? 0) +
                 ((importResult as Record<string, unknown[]>).parseErrors?.length ?? 0) +
                 ((importResult as Record<string, unknown[]>).subjectErrors?.length ?? 0)}
              </p>
              <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">Errors</p>
            </div>
          </div>

          {(importResult as Record<string, unknown[]>).created?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-secondary">Created Users</p>
              <div className="text-xs text-tertiary space-y-0.5 max-h-32 overflow-y-auto">
                {(importResult as Record<string, { name: string; email: string }[]>).created.map((u: { name: string; email: string }) => (
                  <p key={u.email}>{u.name} — {u.email}</p>
                ))}
              </div>
            </div>
          )}

          {(importResult as Record<string, unknown[]>).skipped?.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-secondary">Skipped</p>
              <div className="text-xs text-tertiary space-y-0.5 max-h-24 overflow-y-auto">
                {(importResult as Record<string, { row: number; email: string; reason: string }[]>).skipped.map((s: { row: number; email: string; reason: string }) => (
                  <p key={`skip-${s.row}`}>Row {s.row}: {s.email} — {s.reason}</p>
                ))}
              </div>
            </div>
          )}

          {((importResult as Record<string, unknown[]>).errors?.length > 0 ||
            (importResult as Record<string, unknown[]>).parseErrors?.length > 0 ||
            (importResult as Record<string, unknown[]>).subjectErrors?.length > 0) && (
            <div className="space-y-1">
              <p className="text-xs font-bold text-red-600">Errors</p>
              <div className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-y-auto">
                {(importResult as Record<string, { row: number; message: string }[]>).parseErrors?.map((e: { row: number; message: string }) => (
                  <p key={`parse-${e.row}`}>Row {e.row}: {e.message}</p>
                ))}
                {(importResult as Record<string, { row: number; email?: string; message: string }[]>).errors?.map((e: { row: number; email?: string; message: string }, idx: number) => (
                  <p key={`err-${idx}`}>Row {e.row}: {e.email ? `${e.email} — ` : ""}{e.message}</p>
                ))}
                {(importResult as Record<string, { row: number; subject: string; message: string }[]>).subjectErrors?.map((e: { row: number; subject: string; message: string }) => (
                  <p key={`subj-${e.row}`}>Row {e.row}: {e.subject} — {e.message}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
