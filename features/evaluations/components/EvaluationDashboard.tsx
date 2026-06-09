"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { SkeletonMetricGrid, SkeletonTable } from "@/components/ui/Skeleton"

interface Result {
  id: string
  semesterId: string
  facultyId: string
  departmentId: string | null
  totalRespondents: number
  generalRating: number | null
  remarks: string | null
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
}

interface Period {
  id: string
  name?: string
  title?: string
}

interface Department {
  id: string
  name: string
  code: string
}

interface StudentRow {
  id: string
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  generalRating: number | null
  comment: string | null
}

interface EvaluationDashboardProps {
  apiBase: string
  showDepartmentFilter?: boolean
  title: string
  subtitle: string
}

const CATEGORIES: { key: keyof Pick<Result, "professionalManner" | "communicationWithStudent" | "studentEngagement" | "learningMaterials" | "timeManagement" | "experientialLearning" | "respectUniqueness" | "assessmentAndFeedback">; label: string }[] = [
  { key: "professionalManner", label: "Prof. Manner" },
  { key: "communicationWithStudent", label: "Comm." },
  { key: "studentEngagement", label: "Engag." },
  { key: "learningMaterials", label: "Materials" },
  { key: "timeManagement", label: "Time Mgmt" },
  { key: "experientialLearning", label: "Exper." },
  { key: "respectUniqueness", label: "Respect" },
  { key: "assessmentAndFeedback", label: "Assessment" },
]

const CATEGORIES_FULL: { key: typeof CATEGORIES[number]["key"]; label: string }[] = [
  { key: "professionalManner", label: "Professional Manner" },
  { key: "communicationWithStudent", label: "Communication w/ Students" },
  { key: "studentEngagement", label: "Student Engagement" },
  { key: "learningMaterials", label: "Learning Materials" },
  { key: "timeManagement", label: "Time Management" },
  { key: "experientialLearning", label: "Experiential Learning" },
  { key: "respectUniqueness", label: "Respect for Uniqueness" },
  { key: "assessmentAndFeedback", label: "Assessment & Feedback" },
]

const PAGE_SIZE = 50

function getRemark(general: number | null): string | null {
  if (general === null) return null
  if (general >= 4.5) return "Outstanding"
  if (general >= 3.5) return "Very Satisfactory"
  if (general >= 2.5) return "Satisfactory"
  if (general >= 1.5) return "Unsatisfactory"
  return "Poor"
}

function getRemarkColor(remarks: string | null): string {
  switch (remarks) {
    case "Outstanding": return "bg-emerald-100 text-emerald-800"
    case "Very Satisfactory": return "bg-blue-100 text-blue-800"
    case "Satisfactory": return "bg-amber-100 text-amber-800"
    case "Unsatisfactory": return "bg-rose-100 text-rose-800"
    case "Poor": return "bg-red-100 text-red-800"
    default: return "bg-slate-100 text-slate-600"
  }
}

export default function EvaluationDashboard({
  apiBase,
  showDepartmentFilter = false,
  title,
  subtitle,
}: EvaluationDashboardProps) {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [departments, setDepartments] = useState<Department[]>([])
  const [selectedDept, setSelectedDept] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<Record<string, StudentRow[]>>({})
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [facultyNames, setFacultyNames] = useState<Record<string, string>>({})
  const [page, setPage] = useState(0)

  useEffect(() => {
    fetch("/api/evaluation-periods")
      .then((r) => r.json())
      .then((data) => {
        const list = data.periods || []
        setPeriods(list)
        if (list.length > 0) setSelectedPeriod(list[0].id)
      })
  }, [])

  useEffect(() => {
    if (!showDepartmentFilter) return
    fetch("/api/admin/departments")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setDepartments(list)
      })
  }, [showDepartmentFilter])

  useEffect(() => {
    if (!selectedPeriod) return
    Promise.resolve().then(() => {
      setLoading(true)
      setSelectedFaculty(null)
      setStudentData({})
      setPage(0)
      const params = new URLSearchParams({ periodId: selectedPeriod })
      if (selectedDept) params.set("departmentId", selectedDept)
      fetch(`${apiBase}?${params}&_=${Date.now()}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results || [])
          setFacultyNames(data.facultyNames || {})
          setLoading(false)
        })
    })
  }, [selectedPeriod, selectedDept, apiBase])

  const selectFaculty = useCallback(async (facultyId: string) => {
    if (selectedFaculty === facultyId) { setSelectedFaculty(null); return }
    setSelectedFaculty(facultyId)
    setPage(0)
    if (studentData[facultyId]) return
    setLoadingStudents(true)
    try {
      const r = await fetch(`/api/dean/evaluation-results/details?periodId=${selectedPeriod}&facultyId=${facultyId}`)
      const data = await r.json()
      setStudentData((prev) => ({ ...prev, [facultyId]: data.students || [] }))
    } catch {
      setStudentData((prev) => ({ ...prev, [facultyId]: [] }))
    }
    setLoadingStudents(false)
  }, [selectedPeriod, selectedFaculty, studentData])

  const downloadPDF = useCallback(async () => {
    const { default: jsPDF } = await import("jspdf")
    await import("jspdf-autotable")
    const doc = new jsPDF("landscape")
    const pageW = doc.internal.pageSize.getWidth()
    const periodName = periods.find((p) => p.id === selectedPeriod)?.name || periods.find((p) => p.id === selectedPeriod)?.title || selectedPeriod
    const deptAvg = results.length > 0 ? results.reduce((s, r) => s + (r.generalRating ?? 0), 0) / results.length : 0
    const deptTotalResp = results.reduce((s, r) => s + r.totalRespondents, 0)

    doc.setFontSize(16)
    doc.text("Evaluation Results", pageW / 2, 15, { align: "center" })
    doc.setFontSize(10)
    doc.text(`Period: ${periodName}`, pageW / 2, 22, { align: "center" })
    doc.setFontSize(8)
    doc.text(`Average: ${deptAvg.toFixed(2)}  |  Total Respondents: ${deptTotalResp}  |  Generated: ${new Date().toLocaleDateString()}`, pageW / 2, 28, { align: "center" })

    let y = 34
    for (const r of results) {
      if (y > 180) { doc.addPage(); y = 15 }
      const name = facultyNames[r.facultyId] || r.facultyId
      doc.setFontSize(11)
      doc.text(name, 10, y)
      y += 5
      doc.setFontSize(7)
      doc.text(`General: ${r.generalRating?.toFixed(2) ?? "—"}  |  Respondents: ${r.totalRespondents}  |  Remarks: ${r.remarks || "—"}`, 10, y)
      y += 4
      const catVals = CATEGORIES_FULL.map((c) => (r[c.key] !== null ? r[c.key]!.toFixed(2) : "—"))
      doc.autoTable({ startY: y, head: [CATEGORIES_FULL.map((c) => c.label)], body: [{ columns: catVals }], theme: "grid", styles: { fontSize: 7 }, headStyles: { fillColor: [59, 130, 246] }, tableWidth: "wrap", margin: { left: 10 } })
      y = doc.lastAutoTable.finalY + 5
      const students = studentData[r.facultyId]
      if (students?.length) {
        doc.setFontSize(8)
        doc.text(`Per-Student (${students.length} total — first 100):`, 10, y)
        y += 3
        const slice = students.slice(0, 100)
        const stuHead = ["Student", ...CATEGORIES_FULL.map((c) => c.label === "Communication w/ Students" ? "Comm" : c.label === "Assessment & Feedback" ? "Assess." : c.label), "General", "Comment"]
        const stuBody = slice.map((s) => [s.id, ...CATEGORIES_FULL.map((c) => (s[c.key] !== null ? s[c.key]!.toFixed(2) : "—")), s.generalRating?.toFixed(2) ?? "—", s.comment?.slice(0, 30) ?? ""])
        if (students.length > 100) stuBody.push([`... and ${students.length - 100} more`, "", "", "", "", "", "", "", "", ""])
        doc.autoTable({ startY: y, head: [stuHead], body: stuBody, theme: "grid", styles: { fontSize: 5.5 }, headStyles: { fillColor: [100, 100, 100] }, tableWidth: "wrap", margin: { left: 10 } })
        y = doc.lastAutoTable.finalY + 8
      } else { y += 4 }
    }
    doc.save("evaluation-results.pdf")
  }, [results, periods, selectedPeriod, facultyNames, studentData])

  const departmentSummary = useMemo(() => {
    if (results.length === 0) return null
    const totalResp = results.reduce((s, r) => s + r.totalRespondents, 0)
    const avg = results.reduce((s, r) => s + (r.generalRating ?? 0), 0) / results.length
    const dist: Record<string, number> = { Outstanding: 0, "Very Satisfactory": 0, Satisfactory: 0, Unsatisfactory: 0, Poor: 0 }
    for (const r of results) { const rm = r.remarks; if (rm && rm in dist) dist[rm]++ }
    return { totalResp, avg, dist, facultyCount: results.length }
  }, [results])

  const selectedResult = results.find((r) => r.facultyId === selectedFaculty)
  const selectedStudents = selectedFaculty ? studentData[selectedFaculty] || [] : []

  return (
    <div className="pb-12">
      {/* Top bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-primary">{title}</h1>
            <p className="text-[11px] text-tertiary">{subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            {showDepartmentFilter && (
              <select
                value={selectedDept}
                onChange={(e) => { setSelectedDept(e.target.value); setSelectedFaculty(null) }}
                className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-primary min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-primary min-w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={downloadPDF}
              disabled={results.length === 0}
              className="px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="max-w-[1400px] mx-auto px-6 pt-6 space-y-6">
          <SkeletonMetricGrid count={4} />
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <SkeletonTable rows={7} cols={11} />
          </div>
        </div>
      ) : results.length === 0 ? (
        <p className="text-sm text-tertiary text-center pt-20">No results available for this period.</p>
      ) : (
        <div className="max-w-[1400px] mx-auto px-6 pt-6">
          {/* Summary cards */}
          {departmentSummary && (
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-3xl font-bold text-primary">{departmentSummary.avg.toFixed(2)}</div>
                <div className="text-xs text-tertiary mt-1">Average Rating</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-3xl font-bold text-secondary">{departmentSummary.totalResp.toLocaleString()}</div>
                <div className="text-xs text-tertiary mt-1">Total Respondents</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="text-3xl font-bold text-secondary">{departmentSummary.facultyCount}</div>
                <div className="text-xs text-tertiary mt-1">Faculty Evaluated</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {Object.entries(departmentSummary.dist).filter(([, c]) => c > 0).map(([label, count]) => (
                    <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRemarkColor(label)}`}>{label}: {count}</span>
                  ))}
                </div>
                <div className="text-xs text-tertiary mt-2">Remark Distribution</div>
              </div>
            </div>
          )}

          {/* Main table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-bold text-tertiary uppercase tracking-wider border-b border-slate-200">
                    <th className="p-3 text-left">Faculty</th>
                    {CATEGORIES.map((c) => (
                      <th key={c.key} className="p-3 text-center whitespace-nowrap">{c.label}</th>
                    ))}
                    <th className="p-3 text-center whitespace-nowrap">General</th>
                    <th className="p-3 text-center whitespace-nowrap">Respondents</th>
                    <th className="p-3 text-center">Remark</th>
                    <th className="p-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r) => {
                    const name = facultyNames[r.facultyId] || r.facultyId
                    const isSelected = selectedFaculty === r.facultyId
                    return (
                      <tr key={r.id} className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${isSelected ? "bg-blue-50" : ""}`} onClick={() => selectFaculty(r.facultyId)}>
                        <td className="p-3 font-semibold text-primary whitespace-nowrap">{name}</td>
                        {CATEGORIES.map((c) => (
                          <td key={c.key} className="p-3 text-center text-primary">{r[c.key] !== null ? r[c.key]!.toFixed(2) : "—"}</td>
                        ))}
                        <td className="p-3 text-center font-bold text-primary">{r.generalRating !== null ? r.generalRating.toFixed(2) : "—"}</td>
                        <td className="p-3 text-center text-secondary">{r.totalRespondents}</td>
                        <td className="p-3 text-center">{r.remarks && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(r.remarks)}`}>{r.remarks}</span>}</td>
                        <td className="p-3 text-center">
                          <svg className={`w-4 h-4 mx-auto text-slate-300 transition-transform ${isSelected ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail panel */}
          {selectedFaculty && selectedResult && (
            <DetailPanel
              key={selectedFaculty}
              name={facultyNames[selectedFaculty] || selectedFaculty}
              result={selectedResult}
              students={selectedStudents}
              loading={loadingStudents}
              page={page}
              onPageChange={setPage}
            />
          )}
        </div>
      )}
    </div>
  )
}

function DetailPanel({
  name,
  result,
  students,
  loading,
  page,
  onPageChange,
}: {
  name: string
  result: Result
  students: StudentRow[]
  loading: boolean
  page: number
  onPageChange: (p: number) => void
}) {
  const totalPages = Math.ceil(students.length / PAGE_SIZE)
  const slice = students.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const distribution = useMemo(() => {
    const dist: Record<string, number> = { Outstanding: 0, "Very Satisfactory": 0, Satisfactory: 0, Unsatisfactory: 0, Poor: 0 }
    for (const s of students) { const r = getRemark(s.generalRating); if (r) dist[r]++ }
    return dist
  }, [students])

  return (
    <div className="mt-6">
      <h2 className="text-base font-bold text-primary mb-3">
        {name} — Per-Student Breakdown
        <span className="text-sm font-normal text-tertiary ml-2">({students.length} responses)</span>
      </h2>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <SkeletonTable rows={5} cols={11} />
        </div>
      ) : students.length === 0 ? (
        <p className="text-sm text-tertiary text-center py-10">No individual responses found.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {Object.entries(distribution).filter(([, c]) => c > 0).map(([label, count]) => (
              <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRemarkColor(label)}`}>{label}: {count}</span>
            ))}
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">Total: {students.length}</span>
          </div>

          <div className="flex items-center gap-6 mb-4 bg-slate-50 rounded-lg px-4 py-3 text-sm">
            <span><span className="font-bold text-primary">{result.generalRating?.toFixed(2) ?? "—"}</span> <span className="text-tertiary ml-1">General</span></span>
            <span className="text-slate-300">|</span>
            <span className="text-tertiary">Per-category: {CATEGORIES_FULL.map((c) => `${c.label}: ${result[c.key]?.toFixed(2) ?? "—"}`).join("  |  ")}</span>
          </div>

          <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-tertiary uppercase tracking-wider border-b border-slate-200">
                  <th className="p-2.5 text-left w-10">#</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.key} className="p-2.5 text-center min-w-14">{c.label}</th>
                  ))}
                  <th className="p-2.5 text-center min-w-12">Gen.</th>
                  <th className="p-2.5 text-left min-w-36">Comment</th>
                </tr>
              </thead>
              <tbody>
                {slice.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2.5 font-semibold text-primary">{s.id}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key} className="p-2.5 text-center text-primary">{s[c.key] !== null ? s[c.key]!.toFixed(2) : "—"}</td>
                    ))}
                    <td className="p-2.5 text-center font-bold text-primary">{s.generalRating !== null ? s.generalRating.toFixed(2) : "—"}</td>
                    <td className="p-2.5 text-tertiary max-w-48 truncate" title={s.comment || ""}>{s.comment || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-tertiary mt-3">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, students.length)} of {students.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors text-xs font-medium">Previous</button>
                {getPageButtons(page, totalPages).map((p, _i) =>
                  p === "..." ? <span key={`dot-${_i}`} className="px-1">...</span> : (
                    <button key={p} type="button" onClick={() => onPageChange(p as number)} className={`px-2.5 py-1.5 rounded-md border transition-colors text-xs font-medium ${p === page ? "bg-blue-600 text-white border-blue-600" : "border-slate-200 hover:bg-slate-50"}`}>
                      {(p as number) + 1}
                    </button>
                  )
                )}
                <button type="button" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-md border border-slate-200 disabled:opacity-30 hover:bg-slate-50 transition-colors text-xs font-medium">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function getPageButtons(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i)
  const pages: (number | "...")[] = [0]
  if (current > 2) pages.push("...")
  const start = Math.max(1, current - 1)
  const end = Math.min(total - 2, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 3) pages.push("...")
  if (total > 1) pages.push(total - 1)
  return pages
}
