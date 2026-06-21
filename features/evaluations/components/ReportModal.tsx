"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { getRemark, getRemarkColor } from "./EvaluationDashboard"
import { SentimentBadge } from "./evaluation/SentimentBadge"

interface Period {
  id: string
  name?: string
  title?: string
}

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
  sentimentLabel: string | null
  sentimentScore: number | null
}

interface SubjectMapping {
  id: string
  semesterId: string | null
  faculty: { id: string; name: string; email: string; departmentId: string | null } | null
  subject: { id: string; code: string; name: string } | null
  section: { id: string; name: string; program: string } | null
}

interface DepartmentData {
  id: string
  name: string
  code: string
  deanId: string | null
  isDisabled: boolean
}

const CATEGORIES_FULL: { key: keyof Pick<Result, "professionalManner" | "communicationWithStudent" | "studentEngagement" | "learningMaterials" | "timeManagement" | "experientialLearning" | "respectUniqueness" | "assessmentAndFeedback">; label: string }[] = [
  { key: "professionalManner", label: "Professional Manner" },
  { key: "communicationWithStudent", label: "Communication with Students" },
  { key: "studentEngagement", label: "Student Engagement" },
  { key: "learningMaterials", label: "Learning Materials" },
  { key: "timeManagement", label: "Time Management" },
  { key: "experientialLearning", label: "Experiential Learning" },
  { key: "respectUniqueness", label: "Respect and Fairness" },
  { key: "assessmentAndFeedback", label: "Assessment and Feedback" },
]

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  apiBase: string
  periods: Period[]
  departments: DepartmentData[]
  initialDept: string
  initialPeriod: string
  initialResults: Result[]
  initialFacultyNames: Record<string, string>
  initialStudentData: Record<string, StudentRow[]>
}

function DepartmentView({
  departmentName,
  periodName,
  results,
  facultyNames,
}: {
  departmentName: string
  periodName: string
  results: Result[]
  facultyNames: Record<string, string>
}) {
  const deptAvg = results.length > 0
    ? results.reduce((s, r) => s + (r.generalRating ?? 0), 0) / results.length
    : 0
  const totalResp = results.reduce((s, r) => s + r.totalRespondents, 0)

  return (
    <div className="space-y-6">
      <div className="text-center border-b border-default pb-4">
        <h2 className="text-lg font-bold text-primary">DEPARTMENT EVALUATION REPORT</h2>
        <p className="text-sm text-tertiary mt-1">{periodName}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-surface-muted rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Department</p>
          <p className="text-base font-bold text-primary mt-1">{departmentName || "All Departments"}</p>
        </div>
        <div className="bg-surface-muted rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Faculties Evaluated</p>
          <p className="text-base font-bold text-primary mt-1">{results.length}</p>
        </div>
        <div className="bg-surface-muted rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Department Average</p>
          <p className="text-base font-bold text-primary mt-1">{deptAvg.toFixed(2)}</p>
        </div>
        <div className="bg-surface-muted rounded-xl p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Total Respondents</p>
          <p className="text-base font-bold text-primary mt-1">{totalResp.toLocaleString()}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-default">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-muted">
              <th className="text-left px-4 py-2.5 font-semibold text-primary text-xs uppercase tracking-wider">Faculty</th>
              <th className="text-center px-4 py-2.5 font-semibold text-primary text-xs uppercase tracking-wider">General Rating</th>
              <th className="text-center px-4 py-2.5 font-semibold text-primary text-xs uppercase tracking-wider">Respondents</th>
              <th className="text-center px-4 py-2.5 font-semibold text-primary text-xs uppercase tracking-wider">Remark</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-default">
            {results.map((r) => {
              const name = facultyNames[r.facultyId] || r.facultyId
              return (
                <tr key={r.id} className="hover:bg-surface-muted/50">
                  <td className="px-4 py-2.5 font-medium text-primary">{name}</td>
                  <td className="text-center px-4 py-2.5 font-bold text-primary">{r.generalRating?.toFixed(2) ?? "—"}</td>
                  <td className="text-center px-4 py-2.5 text-secondary">{r.totalRespondents}</td>
                  <td className="text-center px-4 py-2.5">
                    {r.remarks && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(r.remarks)}`}>
                        {r.remarks}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function ReportModal({
  isOpen,
  onClose,
  apiBase,
  periods,
  departments,
  initialDept,
  initialPeriod,
  initialResults,
  initialFacultyNames,
  initialStudentData,
}: ReportModalProps) {
  const [tab, setTab] = useState<"department" | "individual">("department")
  const [periodId, setPeriodId] = useState(initialPeriod)
  const [deptId, setDeptId] = useState(initialDept)
  const [results, setResults] = useState<Result[]>(initialResults)
  const [facultyNames, setFacultyNames] = useState<Record<string, string>>(initialFacultyNames)
  const [facultyStudentData, setFacultyStudentData] = useState<Record<string, StudentRow[]>>(initialStudentData)
  const [facultySubjects, setFacultySubjects] = useState<Record<string, SubjectMapping[]>>({})
  const [fetching, setFetching] = useState(false)

  // Faculty search + selection in individual tab
  const [facultySearch, setFacultySearch] = useState("")
  const [selectedId, setSelectedId] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  // Reset faculty selection when results change
  useEffect(() => {
    setSelectedId("")
    setFacultySearch("")
  }, [periodId, deptId])

  // Fetch results when period or dept changes
  useEffect(() => {
    if (!periodId || !isOpen) return
    if (periodId === initialPeriod && deptId === initialDept) {
      // Use initial data if filters match dashboard
      setResults(initialResults)
      setFacultyNames(initialFacultyNames)
      setFacultyStudentData(initialStudentData)
      return
    }
    const fetchData = async () => {
      setFetching(true)
      setSelectedId("")
      try {
        const params = new URLSearchParams({ periodId })
        if (deptId) params.set("departmentId", deptId)
        const res = await fetch(`${apiBase}?${params}&_=${Date.now()}`)
        if (!res.ok) return
        const data = await res.json()
        setResults(data.results || [])
        setFacultyNames(data.facultyNames || {})
        setFacultyStudentData({})
      } catch { /* ignore */ }
      setFetching(false)
    }
    fetchData()
  }, [periodId, deptId, isOpen, apiBase, initialPeriod, initialDept, initialResults, initialFacultyNames, initialStudentData])

  // Fetch student details for selected faculty
  const fetchStudentDetails = useCallback(async (facultyId: string) => {
    if (facultyStudentData[facultyId]) return facultyStudentData[facultyId]
    try {
      const res = await fetch(`/api/dean/evaluation-results/details?periodId=${periodId}&facultyId=${facultyId}`)
      if (!res.ok) return []
      const data = await res.json()
      const students = data.students || []
      setFacultyStudentData((prev) => ({ ...prev, [facultyId]: students }))
      return students
    } catch { return [] }
  }, [periodId, facultyStudentData])

  // Fetch subjects for selected faculty
  const fetchSubjects = useCallback(async (facultyId: string) => {
    if (facultySubjects[facultyId]) return
    try {
      const res = await fetch(`/api/data/evaluation-mappings?type=faculty`)
      if (!res.ok) return
      const data = await res.json()
      const filtered = (data.data || []).filter(
        (m: SubjectMapping) => m.faculty?.id === facultyId && m.semesterId === periodId
      )
      setFacultySubjects((prev) => ({ ...prev, [facultyId]: filtered }))
    } catch { /* ignore */ }
  }, [periodId, facultySubjects])

  // When faculty selected, load details + subjects
  useEffect(() => {
    if (!selectedId) return
    fetchStudentDetails(selectedId)
    fetchSubjects(selectedId)
  }, [selectedId, fetchStudentDetails, fetchSubjects])

  // Filtered results by department (for department tab)
  const deptResults = useMemo(() => {
    if (!deptId) return results
    return results.filter((r) => r.departmentId === deptId)
  }, [results, deptId])

  // Filtered faculty list for search
  const filteredFaculty = useMemo(() => {
    let list = results
    if (!facultySearch) return list
    const q = facultySearch.toLowerCase()
    return list.filter((r) => (facultyNames[r.facultyId] || r.facultyId).toLowerCase().includes(q))
  }, [results, facultySearch, facultyNames])

  const periodName = periods.find((p) => p.id === periodId)?.name || periods.find((p) => p.id === periodId)?.title || periodId
  const departmentName = departments.find((d) => d.id === deptId)?.name ?? ""

  // Department filter: disabled when dashboard already has a department
  const deptFilterDisabled = initialDept !== ""

  const selectedResult = results.find((r) => r.facultyId === selectedId)
  const selectedStudents = selectedId ? facultyStudentData[selectedId] || [] : []
  const selectedSubjects = selectedId ? facultySubjects[selectedId] || [] : []

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6 bg-black/50 overflow-y-auto" onClick={onClose}>
      <div
        className="w-full max-w-4xl mx-4 bg-surface rounded-2xl shadow-2xl border border-default overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-default">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTab("department")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "department"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-tertiary hover:text-secondary hover:bg-surface-muted"
              }`}
            >
              Department
            </button>
            <button
              type="button"
              onClick={() => setTab("individual")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                tab === "individual"
                  ? "bg-brand-500 text-white shadow-sm"
                  : "text-tertiary hover:text-secondary hover:bg-surface-muted"
              }`}
            >
              Individual
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-tertiary hover:text-secondary hover:bg-surface-muted transition-all"
          >
            Close
          </button>
        </div>

        {/* Filters bar (only in individual tab) */}
        {tab === "individual" && (
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-default bg-surface-muted/30">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Semester</label>
              <select
                value={periodId}
                onChange={(e) => { setPeriodId(e.target.value); setDeptId(initialDept) }}
                className="px-2.5 py-1.5 rounded-lg text-xs text-secondary bg-surface border border-default focus:outline-none focus:ring-2 focus:ring-brand-500/40 min-w-[140px]"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Department</label>
              <select
                value={deptId}
                onChange={(e) => setDeptId(e.target.value)}
                disabled={deptFilterDisabled}
                className={`px-2.5 py-1.5 rounded-lg text-xs min-w-[160px] border focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
                  deptFilterDisabled
                    ? "bg-surface-tertiary text-tertiary cursor-not-allowed border-default/50"
                    : "bg-surface text-secondary border-default"
                }`}
                title={deptFilterDisabled ? "Department is set from the dashboard" : ""}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {tab === "department" ? (
            <DepartmentView
              departmentName={departmentName}
              periodName={periodName}
              results={deptResults}
              facultyNames={facultyNames}
            />
          ) : (
            <div className="space-y-5">
              {fetching ? (
                <div className="text-center py-10 text-sm text-tertiary">Loading...</div>
              ) : (
                <>
                  {/* Faculty search */}
                  <div className="relative">
                    <label className="text-xs font-semibold text-tertiary mb-1.5 block">Search Faculty</label>
                    <input
                      type="text"
                      value={facultySearch}
                      onChange={(e) => { setFacultySearch(e.target.value); setShowDropdown(true) }}
                      onFocus={() => setShowDropdown(true)}
                      onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                      placeholder="Type faculty name..."
                      className="w-full px-3 py-2 rounded-lg text-sm text-secondary bg-surface border border-default focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                    />
                    {showDropdown && filteredFaculty.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-surface border border-default rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filteredFaculty.map((r) => {
                          const name = facultyNames[r.facultyId] || r.facultyId
                          const isSelected = r.facultyId === selectedId
                          return (
                            <button
                              key={r.facultyId}
                              type="button"
                              onMouseDown={() => { setSelectedId(r.facultyId); setFacultySearch(name); setShowDropdown(false) }}
                              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                                isSelected ? "bg-brand-50 text-brand-700 font-semibold" : "text-secondary hover:bg-surface-muted"
                              }`}
                            >
                              {name}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected faculty report */}
                  {selectedResult ? (
                    <IndividualPreview
                      result={selectedResult}
                      name={facultyNames[selectedResult.facultyId] || selectedResult.facultyId}
                      students={selectedStudents}
                      subjects={selectedSubjects}
                    />
                  ) : (
                    <div className="text-center py-10 text-sm text-tertiary">
                      Search and select a faculty member to view their evaluation report.
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function IndividualPreview({
  result,
  name,
  students,
  subjects,
}: {
  result: Result
  name: string
  students: StudentRow[]
  subjects: SubjectMapping[]
}) {
  const overall = result.generalRating ?? 0
  const remarkLabel = getRemark(overall) ?? ""
  const comments = students.filter((s) => s.comment?.trim())

  const sentLabels = comments.map((c) => c.sentimentLabel).filter(Boolean)
  const posCount = sentLabels.filter((l) => l === "positive").length
  const negCount = sentLabels.filter((l) => l === "negative").length
  const neutralCount = sentLabels.filter((l) => l === "neutral").length

  let interp = `The instructor received an overall rating of ${overall.toFixed(2)}, indicating a ${remarkLabel.toLowerCase()} level of performance. `
  if (comments.length > 0 && posCount > negCount && posCount > 0) {
    interp += `Student feedback was predominantly positive (${Math.round((posCount / comments.length) * 100)}% of comments), with many students expressing appreciation for the instructor's teaching approach and classroom management. `
  } else if (comments.length > 0 && negCount > posCount && negCount > 0) {
    interp += `Some students provided critical feedback (${Math.round((negCount / comments.length) * 100)}% of comments), suggesting areas for improvement in instructional delivery and student engagement. `
  }
  if (comments.length > 0 && neutralCount > 0) {
    interp += `A portion of comments were neutral or mixed, reflecting balanced perspectives on the instructor's overall effectiveness. `
  }
  interp += `The results reflect the collective assessment of ${result.totalRespondents} student respondent(s).`

  // Unique subjects
  const uniqueSubjects = subjects.filter((s, i, arr) => arr.findIndex((x) => x.subject?.id === s.subject?.id) === i)

  return (
    <div className="border border-default rounded-xl p-5 space-y-5 bg-surface">
      <div className="text-center border-b border-default pb-3">
        <p className="text-sm font-semibold text-secondary">{name}</p>
      </div>

      {/* Subjects handled */}
      {uniqueSubjects.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">Subjects Handled</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueSubjects.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-medium border border-blue-200">
                {s.subject?.code && <span className="font-semibold">{s.subject.code}</span>}
                {s.subject?.name || "Unknown"}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Rating table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-brand-500 text-white">
            <th className="text-center px-3 py-2 text-xs font-semibold w-10">#</th>
            <th className="text-left px-3 py-2 text-xs font-semibold">Category</th>
            <th className="text-center px-3 py-2 text-xs font-semibold w-20">Rating</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-default">
          <tr className="font-bold bg-brand-50/50 dark:bg-brand-900/10">
            <td className="text-center px-3 py-2 text-primary">0</td>
            <td className="px-3 py-2 text-primary">OVERALL EVALUATION RESULT</td>
            <td className="text-center px-3 py-2 text-primary">{overall.toFixed(2)}</td>
          </tr>
          {CATEGORIES_FULL.map((c, i) => (
            <tr key={c.key}>
              <td className="text-center px-3 py-2 text-secondary">{i + 1}</td>
              <td className="px-3 py-2 text-primary">{c.label}</td>
              <td className="text-center px-3 py-2 text-primary">
                {result[c.key] !== null ? result[c.key]!.toFixed(2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-center py-2">
        <p className="text-sm font-semibold text-primary">Overall Rating</p>
        <p className="text-lg font-bold text-primary">{overall.toFixed(2)} / 5.00 – {remarkLabel}</p>
      </div>

      {/* All comments with sentiment badges */}
      {comments.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-primary mb-2">Student Comments ({comments.length})</p>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {comments.map((s) => (
              <div key={s.id} className="flex items-start gap-2 bg-surface-muted rounded-lg px-3 py-2 border border-default">
                <SentimentBadge label={s.sentimentLabel} score={s.sentimentScore} />
                <p className="text-sm text-tertiary flex-1 min-w-0">
                  &ldquo;{s.comment!.trim()}&rdquo;
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-semibold text-primary mb-1">Interpretation</p>
        <p className="text-sm text-tertiary leading-relaxed">{interp}</p>
      </div>
    </div>
  )
}
