"use client"

import { useState, useRef, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import SubmitButton from "@/components/SubmitButton"

type ImportType = "users" | "students"

interface ImportResult {
  created: { name: string; email: string; role: string; department: string | null; course: string | null }[]
  skipped: { row: number; email: string; reason: string }[]
  errors: { row: number; email?: string; message: string }[]
  parseErrors: { row: number; message: string }[]
}

export default function MobileDeanUploadPage() {
  const { data: session } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importType, setImportType] = useState<ImportType>("users")
  const [result, setResult] = useState<ImportResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!session) return
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
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
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Bulk Import</h1>
        <Link
          href="/dean/upload?desktop=1"
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Desktop view
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setImportType("users"); setResult(null); setError("") }}
          className={`card p-4 bg-white text-left border-2 transition-colors min-h-[44px] ${
            importType === "users" ? "border-gold-300 bg-gold-50/30" : "border-transparent hover:border-slate-200"
          }`}
        >
          <p className="text-xs font-semibold text-slate-700">Faculty / Staff</p>
          <p className="text-[10px] font-mono text-slate-400 mt-1">name, email, dept</p>
          {importType === "users" && (
            <span className="inline-block mt-1 text-[9px] font-bold text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full">SELECTED</span>
          )}
        </button>

        <button
          onClick={() => { setImportType("students"); setResult(null); setError("") }}
          className={`card p-4 bg-white text-left border-2 transition-colors min-h-[44px] ${
            importType === "students" ? "border-gold-300 bg-gold-50/30" : "border-transparent hover:border-slate-200"
          }`}
        >
          <p className="text-xs font-semibold text-slate-700">Students</p>
          <p className="text-[10px] font-mono text-slate-400 mt-1">name, email, course</p>
          {importType === "students" && (
            <span className="inline-block mt-1 text-[9px] font-bold text-gold-600 bg-gold-100 px-2 py-0.5 rounded-full">SELECTED</span>
          )}
        </button>
      </div>

      <div className="flex gap-3">
        <a
          href="/api/import/users"
          download="import_users_template.csv"
          className="flex-1 text-center text-xs font-semibold text-gold-600 hover:text-gold-800 bg-gold-50 border border-gold-200 rounded-lg px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Template
        </a>
        <a
          href="/api/import/students"
          download="import_students_template.csv"
          className="flex-1 text-center text-xs font-semibold text-gold-600 hover:text-gold-800 bg-gold-50 border border-gold-200 rounded-lg px-4 py-2.5 min-h-[44px] flex items-center justify-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Template
        </a>
      </div>

      <form onSubmit={handleSubmit} className="card p-4 bg-white space-y-4">
        <p className="text-xs font-semibold text-slate-500">
          Importing as: <span className="text-gold-600">{importType === "users" ? "Faculty / Staff" : "Students"}</span>
        </p>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1.5">CSV File</label>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gold-50 file:text-gold-700 hover:file:bg-gold-100 min-h-[44px]"
          />
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
        <SubmitButton type="submit" loading={loading} variant="primary">
          Upload & Import
        </SubmitButton>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 bg-white text-center min-h-[44px] flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-emerald-600">{totalImported}</p>
              <p className="text-[10px] font-semibold text-slate-500">Created</p>
            </div>
            <div className="card p-3 bg-white text-center min-h-[44px] flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-amber-600">{totalSkipped}</p>
              <p className="text-[10px] font-semibold text-slate-500">Skipped</p>
            </div>
            <div className="card p-3 bg-white text-center min-h-[44px] flex flex-col items-center justify-center">
              <p className="text-xl font-bold text-red-600">{totalErrors}</p>
              <p className="text-[10px] font-semibold text-slate-500">Errors</p>
            </div>
          </div>

          {result.created.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Created Users</h3>
              <div className="space-y-2">
                {result.created.map((u) => (
                  <div key={u.email} className="card p-3 bg-white">
                    <p className="text-sm font-semibold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500">{u.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">{u.role}</span>
                      <span className="text-[10px] text-slate-400">·</span>
                      <span className="text-[10px] text-slate-400">{u.department || u.course || "—"}</span>
                    </div>
                  </div>
                ))}
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

      <div className="text-center pt-2">
        <Link
          href="/dean/upload?desktop=1"
          className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2"
        >
          Desktop view
        </Link>
      </div>
    </div>
  )
}
