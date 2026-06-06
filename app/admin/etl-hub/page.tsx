"use client"

import { useState, useEffect, useCallback } from "react"
import BulkStudentImport from "@/components/bulk-import/BulkStudentImport"
import BulkFacultyImport from "@/components/bulk-import/BulkFacultyImport"

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

function ViewMappings() {
  const [tab, setTab] = useState<"faculty" | "student">("faculty")
  const [facultyData, setFacultyData] = useState<MappedFaculty[] | null>(null)
  const [studentData, setStudentData] = useState<MappedStudent[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [facultySearch, setFacultySearch] = useState("")
  const [studentSearch, setStudentSearch] = useState("")

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
