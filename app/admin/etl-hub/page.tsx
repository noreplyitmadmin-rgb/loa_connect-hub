"use client"

import { useState, useEffect, useCallback } from "react"
import BulkStudentImport from "@/components/bulk-import/BulkStudentImport"
import BulkFacultyImport from "@/components/bulk-import/BulkFacultyImport"

interface MappedFaculty {
  id: string
  faculty: { id: string; name: string; email: string }
  subject: { id: string; code: string; name: string }
  section: { id: string; name: string; program: string }
  student_count: number
}

interface MappedStudent {
  id: string
  student: { id: string; name: string; email: string }
  section: { id: string; name: string; program: string }
}

function ViewMappings() {
  const [tab, setTab] = useState<"faculty" | "student">("faculty")
  const [facultyData, setFacultyData] = useState<MappedFaculty[] | null>(null)
  const [studentData, setStudentData] = useState<MappedStudent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [facultySearch, setFacultySearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [facultySubjectFilter, setFacultySubjectFilter] = useState("")
  const [facultySectionFilter, setFacultySectionFilter] = useState("")
  const [studentSectionFilter, setStudentSectionFilter] = useState("")
  const [viewingClass, setViewingClass] = useState<MappedFaculty | null>(null)

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) {
      setLoading(true)
      setError("")
    }
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

  useEffect(() => { Promise.resolve().then(() => fetchData()) }, [fetchData])

  useEffect(() => {
    const handler = () => fetchData(true)
    window.addEventListener("app:refresh", handler)
    return () => window.removeEventListener("app:refresh", handler)
  }, [fetchData])

  const facultySubjects = facultyData
    ? [...new Map(facultyData.map((m) => [m.subject.id, m.subject])).values()]
    : []
  const facultySections = facultyData
    ? [...new Map(facultyData.map((m) => [m.section.id, m.section])).values()]
    : []
  const studentSections = studentData
    ? [...new Map(studentData.map((m) => [m.section.id, m.section])).values()]
    : []

  const filteredFaculty = facultyData?.filter((m) => {
    if (facultySubjectFilter && m.subject.id !== facultySubjectFilter) return false
    if (facultySectionFilter && m.section.id !== facultySectionFilter) return false
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
    if (studentSectionFilter && m.section.id !== studentSectionFilter) return false
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
          onClick={() => fetchData(true)}
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
          <div className="flex gap-2">
            <select
              value={facultySubjectFilter}
              onChange={(e) => setFacultySubjectFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
            >
              <option value="">All Subjects</option>
              {facultySubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
              ))}
            </select>
            <select
              value={facultySectionFilter}
              onChange={(e) => setFacultySectionFilter(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
            >
              <option value="">All Sections</option>
              {facultySections.map((s) => (
                <option key={s.id} value={s.id}>{s.program}-{s.name}</option>
              ))}
            </select>
          </div>
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
                  <th className="p-2 text-right">Students</th>
                  <th className="p-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {filteredFaculty?.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-xs text-tertiary">No mappings found.</td></tr>
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
                      <td className="p-2 text-right">
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {m.student_count}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => setViewingClass(m)}
                          className="text-[10px] font-semibold px-2 py-1 rounded border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                        >
                          View
                        </button>
                      </td>
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
          <select
            value={studentSectionFilter}
            onChange={(e) => setStudentSectionFilter(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
          >
            <option value="">All Sections</option>
            {studentSections.map((s) => (
              <option key={s.id} value={s.id}>{s.program}-{s.name}</option>
            ))}
          </select>
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

      {viewingClass && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 bg-black/60" onClick={() => setViewingClass(null)}>
          <div className="bg-white dark:bg-surface-dim rounded-2xl w-full max-w-2xl mx-4 shadow-2xl border border-default overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-default">
              <div className="min-w-0">
                <p className="text-sm font-bold text-secondary truncate">{viewingClass.faculty.name}</p>
                <p className="text-xs text-tertiary truncate">{viewingClass.subject.code} — {viewingClass.section.program}-{viewingClass.section.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setViewingClass(null)}
                className="text-xs p-1.5 rounded-lg hover:bg-surface-dim transition-colors shrink-0"
              >
                <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {(() => {
                const enrolled = (studentData || []).filter((e) => e.section.id === viewingClass.section.id)
                if (enrolled.length === 0) {
                  return <p className="text-xs text-tertiary text-center py-6">No students enrolled in this section.</p>
                }
                return (
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="text-left text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-default">
                        <th className="p-2 w-8">#</th>
                        <th className="p-2">Student</th>
                        <th className="p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {enrolled.map((e, i) => (
                        <tr key={e.id} className="border-b border-default hover:bg-surface-hover">
                          <td className="p-2 text-tertiary">{i + 1}</td>
                          <td className="p-2 font-medium text-secondary">{e.student.name}</td>
                          <td className="p-2 text-tertiary">{e.student.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              })()}
            </div>
            <div className="flex items-center justify-between px-6 py-3 border-t border-default bg-surface-dim text-xs text-tertiary">
              <span>{studentData?.filter((e) => e.section.id === viewingClass.section.id).length ?? 0} student(s) enrolled</span>
              <button
                type="button"
                onClick={() => {
                  const enrolled = (studentData || []).filter((e) => e.section.id === viewingClass.section.id)
                  const csv = "name,email\n" + enrolled.map((e) => `${e.student.name},${e.student.email}`).join("\n")
                  const blob = new Blob([csv], { type: "text/csv" })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement("a")
                  a.href = url
                  a.download = `students-${viewingClass.section.program}-${viewingClass.section.name}.csv`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EtlHubPage() {
  const [importTab, setImportTab] = useState<"student" | "faculty">("student")
  const [resetState, setResetState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [resetMessage, setResetMessage] = useState("")

  async function handleReset() {
    if (!window.confirm("This will permanently delete ALL imported data (evaluations, enrollments, faculty-subject mappings, sections, subjects, appointments, etc.) except seed records. Are you sure?")) return
    if (!window.confirm("This action CANNOT be undone. Proceed?")) return
    setResetState("loading")
    setResetMessage("")
    try {
      const res = await fetch("/api/admin/reset-data", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setResetState("success")
        setResetMessage("All data has been reset successfully.")
        window.dispatchEvent(new CustomEvent("app:refresh"))
      } else {
        setResetState("error")
        setResetMessage(data.error ?? "Reset failed.")
      }
    } catch {
      setResetState("error")
      setResetMessage("Network error — could not reach the server.")
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">ETL Hub</h1>
        <p className="text-sm text-tertiary mt-1">
          Upload CSV files to import evaluation data into the system.
        </p>
      </div>

      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary">Bulk Import</h3>
        <p className="text-sm text-tertiary mt-1">
          Upload CSV files to import evaluation data into the system.
        </p>

        <div className="flex gap-1 mt-4 mb-6 border-b border-default">
          <button
            type="button"
            onClick={() => setImportTab("student")}
            className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${
              importTab === "student" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
            }`}
          >
            Student Import
          </button>
          <button
            type="button"
            onClick={() => setImportTab("faculty")}
            className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${
              importTab === "faculty" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
            }`}
          >
            Faculty Import
          </button>
        </div>

        {importTab === "student" ? <BulkStudentImport /> : <BulkFacultyImport />}
      </div>

      <ViewMappings />

      <div className="card p-6 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">Reset Data</h3>
        <p className="text-sm text-tertiary mt-1">
          Permanently delete all imported evaluation data except seed records (admin accounts, CCS department).
        </p>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={resetState === "loading"}
            className="text-xs font-semibold px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {resetState === "loading" ? "Resetting..." : "Reset All Data"}
          </button>
          {resetState === "success" && <span className="text-xs font-medium text-green-600">{resetMessage}</span>}
          {resetState === "error" && <span className="text-xs font-medium text-red-600">{resetMessage}</span>}
        </div>
      </div>
    </div>
  )
}
