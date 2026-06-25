"use client"

import { useState, useEffect, useCallback } from "react"
import { usePagination, Paginator } from "@/components/ui/Paginator"
import BulkStudentImport from "@/features/users/components/bulk-import/BulkStudentImport"
import BulkFacultyImport from "@/features/users/components/bulk-import/BulkFacultyImport"
import Skeleton, { SkeletonMetricGrid, SkeletonTable } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import type { DepartmentData, SemesterData } from "@/lib/types"

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
  const [errorMessage, setErrorMessage] = useState("")
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [facultySectionFilter, setFacultySectionFilter] = useState("")
  const [studentSectionFilter, setStudentSectionFilter] = useState("")
  const [viewingClass, setViewingClass] = useState<MappedFaculty | null>(null)

  const fetchData = useCallback(async (isRefresh?: boolean) => {
    if (isRefresh) {
      setLoading(true)
      setErrorMessage("")
    }
    try {
      const [facultyRes, studentRes] = await Promise.all([
        fetch("/api/data/evaluation-mappings?type=faculty"),
        fetch("/api/data/evaluation-mappings?type=student"),
      ])
      if (facultyRes.status === 403) { setLockedEndpoint("/api/data/evaluation-mappings?type=faculty"); return }
      if (studentRes.status === 403) { setLockedEndpoint("/api/data/evaluation-mappings?type=student"); return }
      if (!facultyRes.ok) throw new Error("Failed to load faculty mappings")
      if (!studentRes.ok) throw new Error("Failed to load student enrollments")
      const [facultyJson, studentJson] = await Promise.all([facultyRes.json(), studentRes.json()])
      setFacultyData(facultyJson.data)
      setStudentData(studentJson.data)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unknown error")
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

  const facultySections = facultyData
    ? [...new Map(facultyData.map((m) => [m.section.id, m.section])).values()]
    : []
  const studentSections = studentData
    ? [...new Map(studentData.map((m) => [m.section.id, m.section])).values()]
    : []

  const totalFaculty = facultyData ? [...new Set(facultyData.map((m) => m.faculty.id))].length : 0
  const totalSubjects = facultyData ? [...new Set(facultyData.map((m) => m.subject.id))].length : 0
  const totalSectionsF = facultyData ? [...new Set(facultyData.map((m) => m.section.id))].length : 0
  const totalStudents = studentData?.length ?? 0

  const filteredFaculty = facultyData?.filter((m) => {
    if (facultySectionFilter && m.section.id !== facultySectionFilter) return false
    return true
  })

  const filteredStudents = studentData?.filter((m) => {
    if (studentSectionFilter && m.section.id !== studentSectionFilter) return false
    return true
  })

  const facPagination = usePagination(filteredFaculty ?? [], 25)
  const studentPagination = usePagination(filteredStudents ?? [], 25)
  const enrolled = viewingClass ? (studentData || []).filter((e) => e.section.id === viewingClass.section.id) : []
  const enrolledPagination = usePagination(enrolled, 25)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-primary">Data Preview</h3>
        <button
          type="button"
          onClick={() => fetchData(true)}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {lockedEndpoint ? (
        <LockedTab endpoint={lockedEndpoint} />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); fetchData(true) }} />
      ) : loading && !facultyData ? (
        <div className="space-y-4">
          <SkeletonMetricGrid count={4} />
          <div className="flex gap-1 border-b border-default pb-2">
            <Skeleton variant="badge" className="h-6 w-32" />
            <Skeleton variant="badge" className="h-6 w-32" />
          </div>
          <Skeleton variant="text" className="max-w-xs h-8 rounded-lg" />
          <SkeletonTable rows={8} cols={5} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="bg-gradient-to-br from-gold-50 to-amber-50 dark:from-gold-900/20 dark:to-amber-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-gold-600">{totalFaculty}</p>
              <p className="text-[10px] font-semibold text-gold-700/70 dark:text-gold-300/70 uppercase tracking-wider">Faculty</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-600">{totalSubjects}</p>
              <p className="text-[10px] font-semibold text-blue-700/70 dark:text-blue-300/70 uppercase tracking-wider">Subjects</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-600">{totalSectionsF}</p>
              <p className="text-[10px] font-semibold text-purple-700/70 dark:text-purple-300/70 uppercase tracking-wider">Sections</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{totalStudents}</p>
              <p className="text-[10px] font-semibold text-emerald-700/70 dark:text-emerald-300/70 uppercase tracking-wider">Students</p>
            </div>
          </div>

          <div className="flex gap-1 mb-4 border-b border-default">
            <button
              type="button"
              onClick={() => setTab("faculty")}
              className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${tab === "faculty" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
                }`}
            >
              Faculty-Subject ({facultyData?.length ?? "..."})
            </button>
            <button
              type="button"
              onClick={() => setTab("student")}
              className={`text-xs font-semibold px-3 py-2 border-b-2 transition-colors ${tab === "student" ? "border-gold-600 text-gold-700" : "border-transparent text-tertiary hover:text-secondary"
                }`}
            >
              Student Enrollments ({studentData?.length ?? "..."})
            </button>
          </div>

          {tab === "faculty" && (
            <div className="space-y-3">
              <select
                value={facultySectionFilter}
                onChange={(e) => setFacultySectionFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
              >
                <option value="">All Sections</option>
                {facultySections.map((s) => (
                  <option key={s.id} value={s.id}>{s.program}-{s.name}</option>
                ))}
              </select>
              <div className="desktop-only max-h-72 overflow-y-auto tbl-container tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Faculty</th>
                      <th>Subject</th>
                      <th>Section</th>
                      <th className="text-right">Students</th>
                      <th className="w-12"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFaculty?.length === 0 ? (
                      <tr><td colSpan={5} className="p-4 text-center text-xs text-tertiary">No mappings yet.</td></tr>
                    ) : (
                      facPagination.paginatedItems.map((m) => (
                        <tr key={m.id}>
                          <td className="font-medium text-secondary">{m.faculty.name}</td>
                          <td>
                            <span className="font-medium text-secondary">{m.subject.code}</span>
                          </td>
                          <td className="text-secondary">{m.section.program}-{m.section.name}</td>
                          <td className="text-right">
                            <span className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                              {m.student_count}
                            </span>
                          </td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={() => setViewingClass(m)}
                              className="text-[10px] font-semibold px-2 py-1 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
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
              <div className="mobile-only space-y-2">
                {filteredFaculty?.length === 0 ? (
                  <p className="text-xs text-tertiary text-center py-8">No mappings yet.</p>
                ) : (
                  facPagination.paginatedItems.map((m) => (
                    <div key={m.id} className="rounded-xl border border-default bg-surface p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary truncate">{m.faculty.name}</p>
                          <p className="text-[11px] text-tertiary">{m.subject.code} — {m.section.program}-{m.section.name}</p>
                        </div>
                        <span className="shrink-0 inline-flex items-center justify-center min-w-[1.5rem] px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                          {m.student_count}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setViewingClass(m)}
                        className="w-full text-xs font-semibold py-2 rounded-lg border border-default bg-surface-hover hover:bg-surface-dim transition-colors"
                      >
                        View Class
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Paginator page={facPagination.page} totalPages={facPagination.totalPages} pageSize={facPagination.pageSize} totalItems={filteredFaculty?.length ?? 0} setPage={facPagination.setPage} setPageSize={facPagination.setPageSize} showSizeSelector={false} />
            </div>
          )}

          {tab === "student" && (
            <div className="space-y-3">
              <select
                value={studentSectionFilter}
                onChange={(e) => setStudentSectionFilter(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
              >
                <option value="">All Sections</option>
                {studentSections.map((s) => (
                  <option key={s.id} value={s.id}>{s.program}-{s.name}</option>
                ))}
              </select>
              <div className="desktop-only max-h-72 overflow-y-auto tbl-container tbl">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents?.length === 0 ? (
                      <tr><td colSpan={2} className="p-4 text-center text-xs text-tertiary">No enrollments yet.</td></tr>
                    ) : (
                      studentPagination.paginatedItems.map((m) => (
                        <tr key={m.id}>
                          <td className="font-medium text-secondary">{m.student.name}</td>
                          <td className="text-secondary">{m.section.program}-{m.section.name}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mobile-only space-y-2">
                {filteredStudents?.length === 0 ? (
                  <p className="text-xs text-tertiary text-center py-8">No enrollments yet.</p>
                ) : (
                  studentPagination.paginatedItems.map((m) => (
                    <div key={m.id} className="rounded-xl border border-default bg-surface p-3 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-primary truncate">{m.student.name}</p>
                        <p className="text-[11px] text-tertiary">{m.section.program}-{m.section.name}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <Paginator page={studentPagination.page} totalPages={studentPagination.totalPages} pageSize={studentPagination.pageSize} totalItems={filteredStudents?.length ?? 0} setPage={studentPagination.setPage} setPageSize={studentPagination.setPageSize} showSizeSelector={false} />
            </div>
          )}
        </>
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
            <div className="p-4 max-h-[60vh] overflow-y-auto tbl">
              {(() => {
                if (enrolled.length === 0) {
                  return <p className="text-xs text-tertiary text-center py-6">No students enrolled in this section.</p>
                }
                  return (
                    <>
                    <table className="desktop-only">
                      <thead>
                        <tr>
                          <th className="w-8">#</th>
                          <th>Student</th>
                          <th>Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {enrolledPagination.paginatedItems.map((e, i) => (
                          <tr key={e.id}>
                            <td className="text-tertiary">{i + 1}</td>
                            <td className="font-medium text-secondary">{e.student.name}</td>
                            <td className="text-tertiary">{e.student.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  <div className="mobile-only space-y-1.5">
                    {enrolledPagination.paginatedItems.map((e, i) => (
                      <div key={e.id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-surface-hover/50 text-xs">
                        <span className="text-tertiary font-mono w-5 shrink-0 text-right">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-secondary truncate">{e.student.name}</p>
                          <p className="text-tertiary truncate">{e.student.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                    <Paginator page={enrolledPagination.page} totalPages={enrolledPagination.totalPages} pageSize={enrolledPagination.pageSize} totalItems={enrolled.length} setPage={enrolledPagination.setPage} setPageSize={enrolledPagination.setPageSize} showSizeSelector={false} />
                  </>
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
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [importTab, setImportTab] = useState<"student" | "faculty">("student")
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [deptId, setDeptId] = useState("")
  const [resetState, setResetState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [resetMessage, setResetMessage] = useState("")
  const [semesterId, setSemesterId] = useState("");
  const [deptLoading, setDeptLoading] = useState(true);
  const [semLoading, setSemLoading] = useState(true);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDeptLoading(true)
      fetch("/api/admin/departments")
        .then((r) => {
          if (r.status === 403) { setLockedEndpoint("/api/admin/departments"); return null }
          return r.json()
        })
        .then((data) => {
          if (data === null) return;
          const list: DepartmentData[] = Array.isArray(data) ? data : (data?.data as DepartmentData[] ?? []);
          setDepartments(list);
        })
        .catch(() => { })
        .finally(() => setDeptLoading(false))
    })
  }, [])

  useEffect(() => {
    Promise.resolve().then(() => {
      setSemLoading(true)
      fetch("/api/semesters")
        .then((r) => {
          if (r.status === 403) { setLockedEndpoint("/api/semesters"); return null }
          return r.json()
        })
        .then((data) => {
          if (data === null) return;
          const list: SemesterData[] = Array.isArray(data) ? data : (data?.data as SemesterData[] ?? []);
          setSemesters(list);
          const active = list.find((s) => s.isActive);
          if (active) setSemesterId(active.id)
        })
        .catch(() => { })
        .finally(() => setSemLoading(false))
    })
  }, [])

  async function handleReset() {
    if (!window.confirm("This will permanently delete ALL imported data (evaluations, enrollments, faculty-subject mappings, sections, subjects, appointments, etc.) except seed records. Are you sure?")) return
    if (!window.confirm("This action CANNOT be undone. Proceed?")) return
    setResetState("loading")
    setResetMessage("")
    try {
      const res = await fetch("/api/admin/reset-data", { method: "POST" })
      if (res.status === 403) { setLockedEndpoint("/api/admin/reset-data"); return }
      const data = await res.json()
      if (res.ok) {
        setResetState("success")
        setResetMessage("All data has been reset successfully.")
        window.dispatchEvent(new CustomEvent("app:refresh"))
      } else {
        setErrorMessage(data.error ?? "Reset failed.")
      }
    } catch {
      setErrorMessage("Network error — could not reach the server.")
    }
  }

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-8 pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    {errorMessage ? (
      <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); window.location.reload() }} />
    ) : (
    <div className="w-full space-y-8 pb-12">
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

        <div className="mt-4 mb-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="text-xs font-semibold text-secondary shrink-0">Department</label>
          {deptLoading ? (
            <Skeleton variant="text" className="w-full sm:w-48 h-9 rounded-lg" />
          ) : (
            <select
              value={deptId}
              onChange={(e) => setDeptId(e.target.value)}
              className="w-full sm:max-w-xs text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
            >
              <option value="">Select department...</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          )}
          <label className="text-xs font-semibold text-secondary shrink-0">Semester</label>
          {semLoading ? (
            <Skeleton variant="text" className="w-full sm:w-48 h-9 rounded-lg" />
          ) : (
              <><select
                value={semesterId}
                onChange={(e) => setSemesterId(e.target.value)}
                className="w-full sm:max-w-xs text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
              >
                <option value="">Select semester...</option>
                {semesters.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select><p className="text-xs text-tertiary ml-0 sm:ml-2 mt-1 sm:mt-0">Reminder: selecting the semester defines the evaluation period for imports.</p></>
          )}

        </div>

        {deptId ? (
          <>
            <div className="flex flex-wrap items-center gap-4 mb-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  checked={importTab === "student"}
                  onChange={() => setImportTab("student")}
                  className="accent-gold-600"
                />
                <span className="text-xs font-medium text-secondary">Student Upload</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importType"
                  checked={importTab === "faculty"}
                  onChange={() => setImportTab("faculty")}
                  className="accent-gold-600"
                />
                <span className="text-xs font-medium text-secondary">Faculty Upload</span>
              </label>
            </div>
            {importTab === "student" ? <BulkStudentImport departmentId={deptId} semesterId={semesterId} /> : <BulkFacultyImport departmentId={deptId} semesterId={semesterId} />}
          </>
        ) : (
          <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
            Select a department above to begin importing.
          </p>
        )}
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
    )}
    </ErrorBoundary>
  )
}
