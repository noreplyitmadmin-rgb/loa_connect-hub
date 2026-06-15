"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useApiGet } from "@/lib/api/client"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import { SkeletonTable } from "@/components/ui/Skeleton"
import SubmitButton from "@/components/ui/SubmitButton"
import LockedTab from "@/components/ui/LockedTab"
import { SearchInput } from "./shared"
import type { FacultyMapping, Enrollment } from "./types"

export function EnrollmentsTab() {
  const [data, setData] = useState<Enrollment[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [locked, setLocked] = useState("")
  const [search, setSearch] = useState("")

  // ── CSV Import state ─────────────────────────────────────
  const csvFileRef = useRef<HTMLInputElement>(null)
  const [csvFsId, setCsvFsId] = useState("")
  const [csvRows, setCsvRows] = useState<{ name: string; email: string }[] | null>(null)
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvImportResult, setCsvImportResult] = useState<{ matched: number; created: number; errors: { row: number; email: string; message: string }[] } | null>(null)
  const [csvError, setCsvError] = useState("")
  const [csvPreviewPage, setCsvPreviewPage] = useState(0)
  const PREVIEW_PAGE_SIZE = 50

  // ── Quick Add state ──────────────────────────────────────
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [formSuccess, setFormSuccess] = useState("")

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) { setLoading(true); setError("") }
    try {
      const res = await fetch("/api/data/evaluation-mappings?type=student")
      if (res.status === 403) { setLocked("/api/data/evaluation-mappings?type=student"); return }
      if (!res.ok) throw new Error("Failed to load student enrollments")
      const json = await res.json()
      setData(json.data)
    } catch (err) { setError(err instanceof Error ? err.message : "Unknown error") }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  const { data: fsData } = useApiGet<{ data: FacultyMapping[] }>("/api/data/evaluation-mappings?type=faculty")
  const facultySubjects = fsData?.data ?? []

  // ── CSV handlers ─────────────────────────────────────────

  const handleCsvFile = (file: File) => {
    setCsvImportResult(null)
    setCsvError("")
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
      if (lines.length < 2) {
        setCsvError("CSV must have a header row and at least one data row")
        return
      }
      const header = lines[0].toLowerCase().replace(/"/g, "")
      if (!header.includes("student name") || !header.includes("email")) {
        setCsvError('CSV must have columns: "student name", "email"')
        return
      }
      const nameIdx = header.split(",").findIndex((c) => c.trim() === "student name")
      const emailIdx = header.split(",").findIndex((c) => c.trim() === "email")
      if (nameIdx === -1 || emailIdx === -1) {
        setCsvError('CSV must have columns: "student name", "email"')
        return
      }
      const parsed: { name: string; email: string }[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(",")
        const name = (cols[nameIdx] ?? "").trim()
        const email = (cols[emailIdx] ?? "").trim().toLowerCase()
        parsed.push({ name, email })
      }
      setCsvRows(parsed)
    }
    reader.readAsText(file)
  }

  const handleCsvImport = async () => {
    if (!csvFsId || !csvRows || csvRows.length === 0) return
    setCsvImporting(true); setCsvImportResult(null); setCsvError("")
    try {
      const res = await fetch("/api/admin/student-enrollments/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faculty_subject_id: csvFsId, rows: csvRows }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Import failed") }
      const result = await res.json()
      setCsvImportResult(result)
      if (result.matched > 0 || result.created > 0) {
        setCsvRows(null)
        fetchData(true)
      }
    } catch (err) { setCsvError((err as Error).message) }
    finally { setCsvImporting(false) }
  }

  const handleCsvRowUpdate = (index: number, value: string) => {
    if (!csvRows) return
    const next = [...csvRows]
    next[index] = { ...next[index], name: value }
    setCsvRows(next)
  }

  const handleCsvRowRemove = (index: number) => {
    if (!csvRows) return
    const next = csvRows.filter((_, i) => i !== index)
    setCsvRows(next)
    if (next.length > 0 && Math.ceil(next.length / PREVIEW_PAGE_SIZE) <= csvPreviewPage) {
      setCsvPreviewPage(Math.max(0, csvPreviewPage - 1))
    }
  }

  const handleCsvReset = () => {
    setCsvRows(null)
    setCsvImportResult(null)
    setCsvPreviewPage(0)
    setCsvError("")
    if (csvFileRef.current) csvFileRef.current.value = ""
  }

  // ── Quick Add handlers ───────────────────────────────────

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName || !formEmail || !csvFsId) return
    setFormSaving(true); setFormError(""); setFormSuccess("")
    try {
      const res = await fetch("/api/admin/student-enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, email: formEmail, faculty_subject_id: csvFsId }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed to add enrollment") }
      setFormName(""); setFormEmail(""); setShowQuickAdd(false)
      setFormSuccess("Enrollment added!")
      setTimeout(() => setFormSuccess(""), 3000)
      fetchData(true)
    } catch (err) { setFormError((err as Error).message) }
    finally { setFormSaving(false) }
  }

  const filtered = data?.filter((m) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      m.student.name.toLowerCase().includes(q) ||
      m.student.email.toLowerCase().includes(q) ||
      `${m.section.program}-${m.section.name}`.toLowerCase().includes(q) ||
      (m.faculty_subject?.subject.code ?? "").toLowerCase().includes(q) ||
      (m.faculty_subject?.subject.name ?? "").toLowerCase().includes(q) ||
      (m.faculty_subject?.faculty.name ?? "").toLowerCase().includes(q)
    )
  })

  const groupedStudents = useMemo(() => {
    const map = new Map<string, { student: Enrollment["student"]; enrollments: Enrollment[] }>()
    for (const e of filtered ?? []) {
      if (!map.has(e.student.id)) {
        map.set(e.student.id, { student: e.student, enrollments: [] })
      }
      map.get(e.student.id)!.enrollments.push(e)
    }
    return Array.from(map.values())
  }, [filtered])

  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(groupedStudents, 25)

  const [selectedStudentEnrollments, setSelectedStudentEnrollments] = useState<Enrollment[] | null>(null)
  const enrolledPagination = usePagination(selectedStudentEnrollments ?? [], 25)

  const domainOk = (email: string) => email.endsWith("@itmlyceumalabang.onmicrosoft.com")

  const paginatedCsvRows = csvRows
    ? csvRows.slice(csvPreviewPage * PREVIEW_PAGE_SIZE, (csvPreviewPage + 1) * PREVIEW_PAGE_SIZE)
    : []
  const totalPreviewPages = csvRows ? Math.ceil(csvRows.length / PREVIEW_PAGE_SIZE) : 0

  return (
    <div className="space-y-6">
      {locked && <LockedTab endpoint={locked} />}
      {!locked && error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {/* ═══════════════════════════════════════════════════
          IMPORT STUDENTS (Bulk CSV + Quick Add)
         ═══════════════════════════════════════════════════ */}
      <div className="card p-4 sm:p-6 bg-surface space-y-6">
        <h2 className="text-sm font-bold text-secondary">Import Students</h2>

        <div>
          <label className="block text-xs font-semibold text-tertiary mb-1">Subject</label>
          <select
            value={csvFsId}
            onChange={(e) => { setCsvFsId(e.target.value); setCsvRows(null); setCsvImportResult(null); setCsvPreviewPage(0); setCsvError(""); if (csvFileRef.current) csvFileRef.current.value = "" }}
            className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
            required
          >
            <option value="">Select subject...</option>
            {facultySubjects.map((fs) => (
              <option key={fs.id} value={fs.id}>
                {fs.section.program} {fs.section.name} - {fs.subject.code} : {fs.subject.name} ({fs.faculty.name})
              </option>
            ))}
          </select>
        </div>

        {!csvFsId && (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            Select a subject above to begin.
          </p>
        )}

        {csvFsId && (
          <>
            {/* ── Bulk Import ───────────────────────────── */}
            <div className="space-y-4 pt-2 border-t border-default/60">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-secondary">Bulk Import via CSV</h3>
                {!csvRows && !csvImportResult && (
                  <a
                    href="/api/admin/student-enrollments/csv"
                    download="enrollment_template.csv"
                    className="flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                  >
                    <svg className="w-4 h-4 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Template
                  </a>
                )}
              </div>

              {!csvRows && !csvImportResult && (
                <div className="space-y-4">
                  <div
                    onClick={() => csvFileRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl bg-surface-dim/30 hover:bg-surface-dim/60 cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-gold-100 dark:bg-gold-900/40 flex items-center justify-center">
                      <svg className="w-6 h-6 text-gold-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-secondary">Tap to choose a CSV file</p>
                    <p className="text-xs text-tertiary">Headers: <code className="bg-surface-dim px-1.5 py-0.5 rounded text-[10px]">student name, email</code></p>
                    <input
                      ref={csvFileRef}
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f) }}
                    />
                  </div>
                  {csvError && <p className="text-xs font-medium text-red-600 text-center">{csvError}</p>}
                </div>
              )}

              {/* Preview table */}
              {csvRows && csvRows.length > 0 && (
                <div className="flex flex-col h-full min-h-[24rem]">
                  {csvImporting && (
                    <div className="mb-3 space-y-1.5">
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-gold-500 h-2.5 rounded-full animate-pulse" style={{ width: "100%" }} />
                      </div>
                      <p className="text-[11px] text-tertiary text-center">Importing enrollments...</p>
                    </div>
                  )}
                  <div className="flex-1 space-y-3 overflow-hidden">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-secondary">
                        {csvRows.length} row{csvRows.length !== 1 ? "s" : ""}
                      </h4>
                      <span className="text-[11px] text-tertiary">student name, email</span>
                    </div>

                    {csvError && <p className="text-xs font-medium text-red-600">{csvError}</p>}

                    <div className="overflow-x-auto max-h-72 overflow-y-auto border border-default rounded-xl">
                      <table className="w-full text-[13px]">
                        <thead>
                          <tr className="bg-surface-dim text-left text-[11px] font-semibold text-tertiary border-b border-default sticky top-0">
                            <th className="p-3 w-8">#</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Name</th>
                            <th className="p-3 w-12"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedCsvRows.map((row, i) => {
                            const absIdx = csvPreviewPage * PREVIEW_PAGE_SIZE + i
                            return (
                              <tr key={`${csvPreviewPage}-${i}`} className="border-b border-default/50 hover:bg-surface-hover">
                                <td className="p-3 text-tertiary">{absIdx + 1}</td>
                                <td className={`p-3 ${domainOk(row.email) ? "text-secondary" : "text-red-500"}`}>
                                  <div className="flex items-center gap-2">
                                    <span>{row.email || <span className="italic text-red-400">missing</span>}</span>
                                    {!domainOk(row.email) && (
                                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-full shrink-0">invalid domain</span>
                                    )}
                                  </div>
                                </td>
                                <td className="p-3">
                                  <input
                                      value={row.name}
                                      onChange={(e) => handleCsvRowUpdate(absIdx, e.target.value)}
                                      disabled={csvImporting}
                                      className="w-full bg-surface-dim/50 border border-transparent focus:border-gold-400 rounded-lg px-2 py-1.5 outline-none text-[13px] disabled:opacity-60"
                                    />
                                </td>
                                <td className="p-3 text-center">
                                  <button
                                    type="button"
                                    disabled={csvImporting}
                                    onClick={() => handleCsvRowRemove(absIdx)}
                                    className="w-7 h-7 flex items-center justify-center rounded-full bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                    title="Remove row"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
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
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-tertiary">
                          Page {csvPreviewPage + 1} of {totalPreviewPages}
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={csvPreviewPage === 0 || csvImporting}
                            onClick={() => setCsvPreviewPage((p) => p - 1)}
                            className="px-4 py-1.5 bg-surface-dim text-secondary rounded-full text-xs font-semibold hover:bg-surface-dim/70 disabled:opacity-40 transition-colors"
                          >
                            Prev
                          </button>
                          <button
                            type="button"
                            disabled={(csvPreviewPage >= totalPreviewPages - 1) || csvImporting}
                            onClick={() => setCsvPreviewPage((p) => p + 1)}
                            className="px-4 py-1.5 bg-surface-dim text-secondary rounded-full text-xs font-semibold hover:bg-surface-dim/70 disabled:opacity-40 transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="sticky bottom-0 pt-4 pb-1 bg-white dark:bg-surface-dim flex items-center gap-3">
                    <button
                      type="button"
                      disabled={csvImporting}
                      onClick={handleCsvReset}
                      className="flex-1 text-sm font-semibold px-4 py-3 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={csvImporting || csvRows.length === 0 || !csvFsId}
                      onClick={handleCsvImport}
                      className="flex-1 text-sm font-semibold px-4 py-3 rounded-xl bg-gold-600 text-white hover:bg-gold-700 disabled:opacity-40 transition-colors"
                    >
                      {csvImporting ? "Importing..." : `Import ${csvRows.length} Row${csvRows.length !== 1 ? "s" : ""}`}
                    </button>
                  </div>
                </div>
              )}

              {csvImportResult && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{csvImportResult.matched}</p>
                      <p className="text-[11px] font-semibold text-emerald-700/70 dark:text-emerald-300/70">Enrolled</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-5 text-center">
                      <p className="text-2xl font-bold text-blue-600">{csvImportResult.created}</p>
                      <p className="text-[11px] font-semibold text-blue-700/70 dark:text-blue-300/70">Users Created</p>
                    </div>
                  </div>

                  {csvImportResult.errors.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-amber-100 dark:border-amber-800/30">
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{csvImportResult.errors.length} Error{csvImportResult.errors.length !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="px-5 py-3 space-y-2 max-h-40 overflow-y-auto">
                        {csvImportResult.errors.slice(0, 5).map((e, i) => (
                          <p key={i} className="text-xs text-amber-700 dark:text-amber-400">Row {e.row}: {e.email} — {e.message}</p>
                        ))}
                        {csvImportResult.errors.length > 5 && <p className="text-xs text-tertiary">...and {csvImportResult.errors.length - 5} more</p>}
                      </div>
                    </div>
                  )}

                  {csvImportResult.errors.length === 0 && csvImportResult.matched > 0 && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl px-5 py-4 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-200 dark:bg-emerald-700 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-emerald-700 dark:text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">All rows processed successfully.</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCsvReset}
                    className="w-full text-sm font-semibold px-4 py-3 rounded-xl border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                  >
                    Import Another File
                  </button>
                </div>
              )}
            </div>

            {/* ── Quick Add ──────────────────────────────── */}
            <div className="space-y-3 pt-2 border-t border-default/60">
              <button
                onClick={() => setShowQuickAdd(!showQuickAdd)}
                className="flex items-center justify-between w-full text-left"
              >
                <h3 className="text-sm font-semibold text-secondary">Quick Add Single Student</h3>
                <span className="text-xs text-tertiary">{showQuickAdd ? "▲" : "▼"}</span>
              </button>
              {showQuickAdd && (
                <form onSubmit={handleQuickAdd} className="space-y-4">
                  {formError && <p className="text-xs font-medium text-red-600 bg-red-50 p-2 rounded">{formError}</p>}
                  {formSuccess && <p className="text-xs font-medium text-green-600 bg-green-50 p-2 rounded">{formSuccess}</p>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-tertiary mb-1">Student Name</label>
                      <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Juan Dela Cruz" className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-tertiary mb-1">Student Email</label>
                      <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g. juan@example.com" className="w-full text-sm bg-surface border border-strong rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" required />
                    </div>
                  </div>
                  <SubmitButton type="submit" loading={formSaving} variant="primary">Add Enrollment</SubmitButton>
                </form>
              )}
            </div>
          </>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════
          ENROLLMENT TABLE
         ═══════════════════════════════════════════════════ */}
      <div className="card p-4 sm:p-6 space-y-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by student name, email, section, subject, or faculty..." />
        {loading && !data ? (
          <SkeletonTable rows={4} cols={3} />
        ) : groupedStudents.length === 0 ? (
          <p className="text-xs text-tertiary text-center py-8">No enrollments found.</p>
        ) : (
          <>
            <div className="desktop-only overflow-x-auto max-h-96 overflow-y-auto border border-default rounded-lg">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="bg-surface-dim text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default sticky top-0">
                    <th className="p-2">Student</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Enrolled Subjects</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((group) => (
                    <tr key={group.student.id} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 font-medium text-secondary">{group.student.name}</td>
                      <td className="p-2 text-tertiary">{group.student.email}</td>
                      <td className="p-2">
                        <span className="font-semibold text-primary">{group.enrollments.length}</span>
                        <button
                          onClick={() => setSelectedStudentEnrollments(group.enrollments)}
                          className="ml-2 text-xs text-amber-600 hover:text-amber-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mobile-only space-y-2">
              {paginatedItems.map((group) => (
                <div key={group.student.id} className="p-4 rounded-xl bg-surface border border-default space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-primary truncate">{group.student.name}</p>
                      <p className="text-xs text-tertiary truncate">{group.student.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-semibold text-secondary">{group.enrollments.length} Subject{group.enrollments.length !== 1 ? "s" : ""}</span>
                      <button
                        onClick={() => setSelectedStudentEnrollments(group.enrollments)}
                        className="block text-[11px] font-semibold text-amber-600 hover:text-amber-800 underline underline-offset-2"
                      >
                        (View)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <Paginator page={page} totalPages={totalPages} pageSize={pageSize} totalItems={groupedStudents.length} setPage={setPage} setPageSize={setPageSize} />
          </>
        )}
        {data && <p className="text-xs text-tertiary">{groupedStudents.length} student{groupedStudents.length !== 1 ? "s" : ""} ({data.length} enrollment{data.length !== 1 ? "s" : ""})</p>}
      </div>

      {/* ── Enrolled Subjects Modal ─────────────────────────── */}
      {selectedStudentEnrollments && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/60" onClick={() => setSelectedStudentEnrollments(null)}>
          <div className="bg-white dark:bg-surface-dim rounded-2xl w-full max-w-2xl mx-4 shadow-2xl border border-default overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <div className="min-w-0">
                <p className="text-sm font-bold text-secondary truncate">{selectedStudentEnrollments[0].student.name}</p>
                <p className="text-xs text-tertiary truncate">{selectedStudentEnrollments.length} enrolled subject{selectedStudentEnrollments.length !== 1 ? "s" : ""}</p>
              </div>
              <button type="button" onClick={() => setSelectedStudentEnrollments(null)} className="text-xs p-1.5 rounded-lg hover:bg-surface-dim transition-colors shrink-0">
                <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              <table className="desktop-only w-full text-[11px]">
                <thead>
                  <tr className="text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default">
                    <th className="p-2 w-8">#</th>
                    <th className="p-2">Section</th>
                    <th className="p-2">Subject</th>
                    <th className="p-2">Faculty</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolledPagination.paginatedItems.map((enr, i) => (
                    <tr key={enr.id} className="border-b border-default hover:bg-surface-hover">
                      <td className="p-2 text-tertiary">{i + 1}</td>
                      <td className="p-2 text-secondary">{enr.section.program}-{enr.section.name}</td>
                      <td className="p-2">
                        {enr.faculty_subject ? (
                          <span className="font-medium text-secondary">{enr.faculty_subject.subject.code} - {enr.faculty_subject.subject.name}</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            No mapping
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-secondary">{enr.faculty_subject?.faculty.name ?? <span className="text-tertiary italic">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mobile-only space-y-1.5">
                {enrolledPagination.paginatedItems.map((enr, i) => (
                  <div key={enr.id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-hover/50 text-xs">
                    <span className="text-tertiary font-mono w-5 shrink-0 text-right">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-secondary truncate">{enr.section.program}-{enr.section.name}</p>
                      <p className="text-tertiary truncate">
                        {enr.faculty_subject ? (
                          <>{enr.faculty_subject.subject.code} - {enr.faculty_subject.subject.name} · {enr.faculty_subject.faculty.name}</>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600">
                            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            No mapping
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-default bg-surface-dim text-xs text-tertiary">
              <span>{selectedStudentEnrollments.length} enrolled subject{selectedStudentEnrollments.length !== 1 ? "s" : ""}</span>
              <Paginator page={enrolledPagination.page} totalPages={enrolledPagination.totalPages} pageSize={enrolledPagination.pageSize} totalItems={selectedStudentEnrollments.length} setPage={enrolledPagination.setPage} setPageSize={enrolledPagination.setPageSize} showSizeSelector={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
