"use client"

import { useState, useRef } from "react"

type ImportType = "users" | "students"

interface ImportRow {
  name: string
  email: string
  role: string
  department: string | null
  course: string | null
}

interface ImportResult {
  created: ImportRow[]
  skipped: { row: number; email: string; reason: string }[]
  errors: { row: number; email?: string; message: string }[]
  parseErrors: { row: number; message: string }[]
}

export default function DeanUploadPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importType, setImportType] = useState<ImportType>("users")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResult(null)

    const file = fileRef.current?.files?.[0]
    if (!file) { setError("Please select a CSV file"); return }

    const formData = new FormData()
    formData.append("file", file)

    const endpoint = importType === "users" ? "/api/import/users" : "/api/import/students"

    setLoading(true)
    try {
      const res = await fetch(endpoint, { method: "POST", body: formData })
      const data = await res.json()
      if (!res.ok) { setError(data.error || "Upload failed"); return }
      setResult(data)
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const totalImported = result?.created.length ?? 0
  const totalSkipped = result?.skipped.length ?? 0
  const totalErrors = (result?.errors.length ?? 0) + (result?.parseErrors.length ?? 0)

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bulk User Import</h1>
        <p className="text-sm text-slate-500 mt-1">Upload a CSV file to create users. Only emails ending with <code className="bg-slate-100 px-1 rounded text-xs">@itmlyceumalabang.onmicrosoft.com</code> are accepted.</p>
      </div>

      {/* Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => { setImportType("users"); setResult(null); setError("") }}
          className={`card p-5 bg-white space-y-3 text-left border-2 transition-colors ${
            importType === "users" ? "border-indigo-300 bg-indigo-50/30" : "border-transparent hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Faculty / Staff</h2>
            {importType === "users" && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">SELECTED</span>}
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-[10px] font-mono text-slate-600 leading-relaxed">
            name, microsoft email, department, dean
          </div>
          <a
            href="/api/import/users"
            download="import_users_template.csv"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </a>
        </button>

        <button
          onClick={() => { setImportType("students"); setResult(null); setError("") }}
          className={`card p-5 bg-white space-y-3 text-left border-2 transition-colors ${
            importType === "students" ? "border-indigo-300 bg-indigo-50/30" : "border-transparent hover:border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-700">Students</h2>
            {importType === "students" && <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">SELECTED</span>}
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-[10px] font-mono text-slate-600 leading-relaxed">
            name, microsoft email, course
          </div>
          <a
            href="/api/import/students"
            download="import_students_template.csv"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Template
          </a>
        </button>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="card p-6 bg-white space-y-4">
        <p className="text-xs font-semibold text-slate-500">
          Importing as: <span className="text-indigo-600">{importType === "users" ? "Faculty / Staff" : "Students"}</span>
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary text-xs font-semibold py-2.5">
          {loading ? "Uploading..." : "Upload & Import"}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalImported}</p>
              <p className="text-xs font-semibold text-slate-500">Created</p>
            </div>
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-amber-600">{totalSkipped}</p>
              <p className="text-xs font-semibold text-slate-500">Skipped</p>
            </div>
            <div className="card p-4 bg-white text-center">
              <p className="text-2xl font-bold text-red-600">{totalErrors}</p>
              <p className="text-xs font-semibold text-slate-500">Errors</p>
            </div>
          </div>

          {result.created.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Created Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="pb-2 pr-4">Name</th>
                      <th className="pb-2 pr-4">Email</th>
                      <th className="pb-2 pr-4">Role</th>
                      {importType === "users" ? (
                        <th className="pb-2 pr-4">Department</th>
                      ) : (
                        <th className="pb-2 pr-4">Course</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {result.created.map((u) => (
                      <tr key={u.email} className="border-b border-slate-100">
                        <td className="py-2 pr-4 text-slate-800">{u.name}</td>
                        <td className="py-2 pr-4 text-slate-600 text-xs">{u.email}</td>
                        <td className="py-2 pr-4">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            u.role === "DEAN" ? "bg-amber-100 text-amber-700" :
                            u.role === "FACULTY" ? "bg-emerald-100 text-emerald-700" :
                            "bg-blue-100 text-blue-700"
                          }`}>{u.role}</span>
                        </td>
                        <td className="py-2 pr-4 text-slate-500 text-xs">
                          {importType === "users" ? (u.department || "—") : (u.course || "—")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {result.skipped.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Skipped</h3>
              <div className="text-xs text-slate-500 space-y-1">
                {result.skipped.map((s) => (
                  <p key={`skip-${s.row}`}>Row {s.row}: {s.email} — {s.reason}</p>
                ))}
              </div>
            </section>
          )}

          {(result.parseErrors.length > 0 || result.errors.length > 0) && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Errors</h3>
              <div className="text-xs text-red-600 space-y-1">
                {result.parseErrors.map((e) => (
                  <p key={`parse-${e.row}`}>Row {e.row}: {e.message}</p>
                ))}
                {result.errors.map((e, idx) => (
                  <p key={`err-${idx}`}>Row {e.row}: {e.email ? `${e.email} — ` : ""}{e.message}</p>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
