"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { SkeletonMetricGrid, SkeletonTable } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import type { DepartmentData } from "@/lib/types"
import { SentimentBadge } from "./evaluation/SentimentBadge"
import ReasonModal from "@/components/ui/ReasonModal"
import ReportModal from "./ReportModal"

interface Result {
  id: string
  semesterId: string
  facultyId: string
  facultySubjectId?: string
  departmentId: string | null
  totalRespondents: number
  unenrolledCount?: number
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

interface EvaluationDashboardProps {
  apiBase: string
  showDepartmentFilter?: boolean
  showVisibilityToggles?: boolean
  showUnenrolledToggle?: boolean
  title: string
  subtitle: string
  perSubject?: boolean
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

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

export function getRemark(general: number | null): string | null {
  if (general === null) return null
  if (general >= 4.5) return "Outstanding"
  if (general >= 3.5) return "Very Satisfactory"
  if (general >= 2.5) return "Satisfactory"
  if (general >= 1.5) return "Unsatisfactory"
  return "Poor"
}

export function getRemarkColor(remarks: string | null): string {
  switch (remarks) {
    case "Outstanding": return "bg-success-bg text-success-text"
    case "Very Satisfactory": return "bg-info-bg text-info-text"
    case "Satisfactory": return "bg-warning-bg text-warning-text"
    case "Unsatisfactory": return "bg-danger-bg text-danger-text"
    case "Poor": return "bg-danger-bg text-danger-text"
    default: return "bg-surface-tertiary text-tertiary"
  }
}

function SummaryCard({ value, label, color }: { value: string | number; label: string; color: "blue" | "green" | "amber" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 text-amber-700",
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colorClasses[color]} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">{label}</p>
    </div>
  )
}

export default function EvaluationDashboard({
  apiBase,
  showDepartmentFilter = false,
  showVisibilityToggles = false,
  showUnenrolledToggle = false,
  title,
  subtitle,
  perSubject = false,
}: EvaluationDashboardProps) {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [departments, setDepartments] = useState<DepartmentData[]>([])
  const [selectedDept, setSelectedDept] = useState("")
  const [showUnenrolled, setShowUnenrolled] = useState(false)
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null)
  const [studentData, setStudentData] = useState<Record<string, StudentRow[]>>({})
  const [uniqueRespondents, setUniqueRespondents] = useState(0)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [facultyNames, setFacultyNames] = useState<Record<string, string>>({})
  const [visibilityMap, setVisibilityMap] = useState<Record<string, boolean>>({})
  const [toggling, setToggling] = useState(false)
  const [page, setPage] = useState(0)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [showReportModal, setShowReportModal] = useState(false)
  const [showReasonModal, setShowReasonModal] = useState(false)
  const [pendingInvalidate, setPendingInvalidate] = useState<{ facultyId?: string; facultySubjectId?: string } | null>(null)

  useEffect(() => {
    const endpoint = "/api/evaluation-periods"
    const fetchData = async () => {
      try {
        const res = await fetch(endpoint)
        if (res.status === 403) { setLockedEndpoint(endpoint); return }
        const data = await res.json()
        const list = data.periods || []
        setPeriods(list)
        if (list.length > 0) setSelectedPeriod(list[0].id)
      } catch {
        setErrorMessage("Failed to load evaluation periods")
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!showDepartmentFilter) return
    const endpoint = "/api/admin/departments"
    const fetchData = async () => {
      try {
        const res = await fetch(endpoint)
        if (res.status === 403) { setLockedEndpoint(endpoint); return }
        const data = await res.json()
        const list = Array.isArray(data) ? data : []
        setDepartments(list)
      } catch {
        setErrorMessage("Failed to load departments")
      }
    }
    fetchData()
  }, [showDepartmentFilter])

  useEffect(() => {
    if (!selectedPeriod) return
    Promise.resolve().then(async () => {
      setLoading(true)
      setSelectedFaculty(null)
      setStudentData({})
      setPage(0)
      const params = new URLSearchParams({ periodId: selectedPeriod })
      if (selectedDept) params.set("departmentId", selectedDept)
      if (showUnenrolled) params.set("source", "all")
      if (perSubject) params.set("perSubject", "1")
      const endpoint = `${apiBase}?${params}&_=${Date.now()}`
      try {
        const res = await fetch(endpoint)
        if (res.status === 403) { setLockedEndpoint(endpoint); setLoading(false); return }
        const data = await res.json()
        setResults(data.results || [])
        setFacultyNames(data.facultyNames || {})
        setVisibilityMap(data.visibilityMap || {})
        setUniqueRespondents(data.uniqueRespondents ?? 0)
      } catch {
        setErrorMessage("Failed to load evaluation results")
      }
      setLoading(false)
    })
  }, [selectedPeriod, selectedDept, showUnenrolled, apiBase])

  const selectFaculty = useCallback(async (facultyId: string) => {
    if (selectedFaculty === facultyId) { setSelectedFaculty(null); return }
    setSelectedFaculty(facultyId)
    setPage(0)
    if (studentData[facultyId]) return
    setLoadingStudents(true)
    try {
      const r = await fetch(`/api/dean/evaluation-results/details?periodId=${selectedPeriod}&facultyId=${facultyId}`)
      if (r.status === 403) { setLockedEndpoint(`/api/dean/evaluation-results/details?periodId=${selectedPeriod}&facultyId=${facultyId}`); setLoadingStudents(false); return }
      const data = await r.json()
      setStudentData((prev) => ({ ...prev, [facultyId]: data.students || [] }))
    } catch {
      setStudentData((prev) => ({ ...prev, [facultyId]: [] }))
    }
    setLoadingStudents(false)
  }, [selectedPeriod, selectedFaculty, studentData])

  const toggleVisibility = useCallback(async (facultyId: string, visible: boolean) => {
    if (!selectedPeriod || toggling) return
    setToggling(true)
    const prev = visibilityMap[facultyId]
    setVisibilityMap((m) => ({ ...m, [facultyId]: visible }))
    try {
      const res = await fetch("/api/admin/evaluation-results/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId: selectedPeriod, facultyIds: [facultyId], visible }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/evaluation-results/visibility"); setVisibilityMap((m) => ({ ...m, [facultyId]: prev })); return }
    } catch {
      setVisibilityMap((m) => ({ ...m, [facultyId]: prev }))
    }
    setToggling(false)
  }, [selectedPeriod, toggling, visibilityMap])

  const bulkSetVisibility = useCallback(async (visible: boolean) => {
    if (!selectedPeriod || results.length === 0 || toggling) return
    setToggling(true)
    const facultyIds = results.map((r) => r.facultyId)
    const prev = { ...visibilityMap }
    const update: Record<string, boolean> = {}
    for (const id of facultyIds) update[id] = visible
    setVisibilityMap((m) => ({ ...m, ...update }))
    try {
      const res = await fetch("/api/admin/evaluation-results/visibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ semesterId: selectedPeriod, facultyIds, visible }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/evaluation-results/visibility"); setVisibilityMap(prev); return }
    } catch {
      setVisibilityMap(prev)
    }
    setToggling(false)
  }, [selectedPeriod, results, toggling, visibilityMap])



  const fetchStudentsForFaculty = useCallback(async (facultyId: string): Promise<StudentRow[]> => {
    if (studentData[facultyId]) return studentData[facultyId]
    try {
      const r = await fetch(`/api/dean/evaluation-results/details?periodId=${selectedPeriod}&facultyId=${facultyId}`)
      const data = await r.json()
      setStudentData((prev) => ({ ...prev, [facultyId]: data.students || [] }))
      return data.students || []
    } catch {
      return []
    }
  }, [selectedPeriod, studentData])

  const downloadFacultyPDF = useCallback(async (facultyResult: Result) => {
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const students = await fetchStudentsForFaculty(facultyResult.facultyId)
    const doc = new jsPDF("portrait")
    const pageW = doc.internal.pageSize.getWidth()
    const name = facultyNames[facultyResult.facultyId] || facultyResult.facultyId
    const periodName = periods.find((p) => p.id === selectedPeriod)?.name || periods.find((p) => p.id === selectedPeriod)?.title || selectedPeriod
    const overall = facultyResult.generalRating ?? 0
    const remarkLabel = getRemark(overall) ?? ""

    // Formal header
    const logoY = 12
    const logoWidth = 28
    let logoHeight = 28
    try {
      const resp = await fetch("/logo-blk.png")
      const blob = await resp.blob()
      const logoData = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = logoData
      })
      logoHeight = logoWidth * (img.naturalHeight / img.naturalWidth)
      doc.addImage(logoData, "PNG", (pageW - logoWidth) / 2, logoY, logoWidth, logoHeight)
    } catch { /* logo not available */ }

    const addrY = logoY + logoHeight + 3
    doc.setFontSize(7)
    doc.text("Main Bldg. Km. 30 National Road, Tunasan, Muntinlupa City", pageW / 2, addrY, { align: "center" })
    const lineY = addrY + 5
    doc.setDrawColor(180, 180, 180)
    doc.line(14, lineY, pageW - 14, lineY)
    doc.setDrawColor(0, 0, 0)

    let y = lineY + 6
    doc.setFontSize(11)
    doc.text("INDIVIDUAL FACULTY EVALUATION REPORT", pageW / 2, y, { align: "center" })
    y += 9
    doc.setFontSize(8)
    doc.text(`Name: ${name}`, 14, y)
    y += 4.5
    doc.text(`Semester: ${periodName}`, 14, y)
    y += 4.5
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y)
    y += 8

    // Rating table
    const tableHead = [["#", "Category", "Rating"]]
    const tableBody: (string | number)[][] = [
      ["0", "OVERALL EVALUATION RESULT", overall.toFixed(2)],
    ]
    CATEGORIES_FULL.forEach((c, i) => {
      tableBody.push([String(i + 1), c.label, facultyResult[c.key] !== null ? facultyResult[c.key]!.toFixed(2) : "—"])
    })

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
      headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
      columnStyles: { 1: { halign: "left", fontStyle: "bold" } },
      tableWidth: "auto",
      margin: { left: 20, right: 20 },
    })
    y = doc.lastAutoTable.finalY + 8

    doc.setFontSize(11)
    doc.text("Overall Rating", pageW / 2, y, { align: "center" })
    y += 6
    doc.setFontSize(13)
    doc.text(`${overall.toFixed(2)} / 5.00 – ${remarkLabel}`, pageW / 2, y, { align: "center" })
    y += 10

    const comments = students.filter((s) => s.comment?.trim())
    if (comments.length > 0) {
      doc.setFontSize(10)
      doc.text("Student Comment", pageW / 2, y, { align: "center" })
      y += 5
      doc.setFontSize(9)

      const maxShow = Math.min(comments.length, 30)
      for (let i = 0; i < maxShow; i++) {
        if (y > 260) { doc.addPage(); y = 20 }
        const text = `"${comments[i].comment!.trim()}"`
        const lines = doc.splitTextToSize(text, pageW - 50)
        doc.text(lines, 25, y)
        y += lines.length * 4 + 3
      }
      if (comments.length > 30) {
        doc.text(`... and ${comments.length - 30} more comments`, 25, y)
        y += 6
      }
      y += 3
    }

    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.text("Interpretation", pageW / 2, y, { align: "center" })
    y += 5
    doc.setFontSize(9)

    const sentLabels = comments.map((c) => c.sentimentLabel).filter((l): l is string => Boolean(l) && l !== "gibberish")
    const posCount = sentLabels.filter((l) => l === "positive").length
    const negCount = sentLabels.filter((l) => l === "negative").length
    const neutralCount = sentLabels.filter((l) => l === "neutral").length
    const hasComments = comments.length > 0
    const unenrolled = facultyResult.unenrolledCount ?? 0

    let interp = `The instructor received an overall rating of ${overall.toFixed(2)}, indicating a ${remarkLabel.toLowerCase()} level of performance. `
    if (hasComments && posCount > negCount && posCount > 0) {
      const pct = Math.round((posCount / comments.length) * 100)
      interp += `Student feedback was predominantly positive (${pct}% of comments), with many students expressing appreciation for the instructor's teaching approach and classroom management. `
    } else if (hasComments && negCount > posCount && negCount > 0) {
      const pct = Math.round((negCount / comments.length) * 100)
      interp += `Some students provided critical feedback (${pct}% of comments), suggesting areas for improvement in instructional delivery and student engagement. `
    }
    if (hasComments && neutralCount > 0) {
      interp += `A portion of comments were neutral or mixed, reflecting balanced perspectives on the instructor's overall effectiveness. `
    }
    if (unenrolled > 0) {
      interp += `The results reflect the collective assessment of ${facultyResult.totalRespondents} student respondent(s), including ${unenrolled} from past/unenrolled students.`
    } else {
      interp += `The results reflect the collective assessment of ${facultyResult.totalRespondents} student respondent(s) currently enrolled in the class.`
    }

    const interpLines = doc.splitTextToSize(interp, pageW - 50)
    doc.text(interpLines, 25, y)

    doc.save(`${slug(name)}-${selectedPeriod}-${Date.now()}.pdf`)
  }, [facultyNames, periods, selectedPeriod, fetchStudentsForFaculty])

  const printFaculty = useCallback(async (facultyResult: Result) => {
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const students = await fetchStudentsForFaculty(facultyResult.facultyId)
    const doc = new jsPDF("portrait")
    const pageW = doc.internal.pageSize.getWidth()
    const name = facultyNames[facultyResult.facultyId] || facultyResult.facultyId
    const periodName = periods.find((p) => p.id === selectedPeriod)?.name || periods.find((p) => p.id === selectedPeriod)?.title || selectedPeriod
    const overall = facultyResult.generalRating ?? 0
    const remarkLabel = getRemark(overall) ?? ""

    const logoY = 12
    const logoWidth = 28
    let logoHeight = 28
    try {
      const resp = await fetch("/logo-blk.png")
      const blob = await resp.blob()
      const logoData = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = logoData
      })
      logoHeight = logoWidth * (img.naturalHeight / img.naturalWidth)
      doc.addImage(logoData, "PNG", (pageW - logoWidth) / 2, logoY, logoWidth, logoHeight)
    } catch { /* logo not available */ }

    const addrY = logoY + logoHeight + 3
    doc.setFontSize(7)
    doc.text("Main Bldg. Km. 30 National Road, Tunasan, Muntinlupa City", pageW / 2, addrY, { align: "center" })
    const lineY = addrY + 5
    doc.setDrawColor(180, 180, 180)
    doc.line(14, lineY, pageW - 14, lineY)
    doc.setDrawColor(0, 0, 0)

    let y = lineY + 6
    doc.setFontSize(11)
    doc.text("INDIVIDUAL FACULTY EVALUATION REPORT", pageW / 2, y, { align: "center" })
    y += 9
    doc.setFontSize(8)
    doc.text(`Name: ${name}`, 14, y)
    y += 4.5
    doc.text(`Semester: ${periodName}`, 14, y)
    y += 4.5
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y)
    y += 8

    const tableHead = [["#", "Category", "Rating"]]
    const tableBody: (string | number)[][] = [
      ["0", "OVERALL EVALUATION RESULT", overall.toFixed(2)],
    ]
    CATEGORIES_FULL.forEach((c, i) => {
      tableBody.push([String(i + 1), c.label, facultyResult[c.key] !== null ? facultyResult[c.key]!.toFixed(2) : "—"])
    })

    autoTable(doc, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
      headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
      columnStyles: { 1: { halign: "left", fontStyle: "bold" } },
      tableWidth: "auto",
      margin: { left: 20, right: 20 },
    })
    y = doc.lastAutoTable.finalY + 8

    doc.setFontSize(11)
    doc.text(`Overall Rating`, pageW / 2, y, { align: "center" })
    y += 6
    doc.setFontSize(13)
    doc.text(`${overall.toFixed(2)} / 5.00 – ${remarkLabel}`, pageW / 2, y, { align: "center" })
    y += 10

    const comments = students.filter((s) => s.comment?.trim())
    if (comments.length > 0) {
      doc.setFontSize(10)
      doc.text("Student Comment", pageW / 2, y, { align: "center" })
      y += 5
      doc.setFontSize(9)

      const maxShow = Math.min(comments.length, 30)
      for (let i = 0; i < maxShow; i++) {
        if (y > 260) { doc.addPage(); y = 20 }
        const text = `"${comments[i].comment!.trim()}"`
        const lines = doc.splitTextToSize(text, pageW - 50)
        doc.text(lines, 25, y)
        y += lines.length * 4 + 3
      }
      if (comments.length > 30) {
        doc.text(`... and ${comments.length - 30} more comments`, 25, y)
        y += 6
      }
      y += 3
    }

    if (y > 240) { doc.addPage(); y = 20 }
    doc.setFontSize(10)
    doc.text("Interpretation", pageW / 2, y, { align: "center" })
    y += 5
    doc.setFontSize(9)

    const sentLabels = comments.map((c) => c.sentimentLabel).filter((l): l is string => Boolean(l) && l !== "gibberish")
    const posCount = sentLabels.filter((l) => l === "positive").length
    const negCount = sentLabels.filter((l) => l === "negative").length
    const neutralCount = sentLabels.filter((l) => l === "neutral").length
    const hasComments = comments.length > 0
    const unenrolled = facultyResult.unenrolledCount ?? 0

    let interp = `The instructor received an overall rating of ${overall.toFixed(2)}, indicating a ${remarkLabel.toLowerCase()} level of performance. `
    if (hasComments && posCount > negCount && posCount > 0) {
      const pct = Math.round((posCount / comments.length) * 100)
      interp += `Student feedback was predominantly positive (${pct}% of comments), with many students expressing appreciation for the instructor's teaching approach and classroom management. `
    } else if (hasComments && negCount > posCount && negCount > 0) {
      const pct = Math.round((negCount / comments.length) * 100)
      interp += `Some students provided critical feedback (${pct}% of comments), suggesting areas for improvement in instructional delivery and student engagement. `
    }
    if (hasComments && neutralCount > 0) {
      interp += `A portion of comments were neutral or mixed, reflecting balanced perspectives on the instructor's overall effectiveness. `
    }
    if (unenrolled > 0) {
      interp += `The results reflect the collective assessment of ${facultyResult.totalRespondents} student respondent(s), including ${unenrolled} from past/unenrolled students.`
    } else {
      interp += `The results reflect the collective assessment of ${facultyResult.totalRespondents} student respondent(s) currently enrolled in the class.`
    }

    const interpLines = doc.splitTextToSize(interp, pageW - 50)
    doc.text(interpLines, 25, y)

    doc.autoPrint()
    doc.output("dataurlnewwindow")
  }, [facultyNames, periods, selectedPeriod, fetchStudentsForFaculty])

  const downloadFacultyCSV = useCallback(async (facultyResult: Result) => {
    const students = await fetchStudentsForFaculty(facultyResult.facultyId)
    const name = facultyNames[facultyResult.facultyId] || facultyResult.facultyId
    const lines: string[] = []
    lines.push(`Faculty,${name}`)
    lines.push(`General Rating,${facultyResult.generalRating?.toFixed(2) ?? ""}`)
    lines.push(`Total Respondents,${facultyResult.totalRespondents}`)
    lines.push(`Remarks,${facultyResult.remarks ?? ""}`)
    lines.push("")
    lines.push("Category Scores")
    lines.push("Category,Score")
    for (const c of CATEGORIES_FULL) {
      lines.push(`${c.label},${facultyResult[c.key] !== null ? facultyResult[c.key]!.toFixed(2) : ""}`)
    }
    if (students.length > 0) {
      lines.push("")
      lines.push("Student Breakdown")
      const headers = ["Student ID", ...CATEGORIES_FULL.map((c) => c.label), "General", "Comment"]
      lines.push(headers.join(","))
      for (const s of students) {
        const vals = [s.id, ...CATEGORIES_FULL.map((c) => (s[c.key] !== null ? s[c.key]!.toFixed(2) : "")), s.generalRating?.toFixed(2) ?? "", `"${(s.comment ?? "").replace(/"/g, '""')}"`]
        lines.push(vals.join(","))
      }
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url; a.download = `${slug(name)}-${selectedPeriod}-${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }, [facultyNames, fetchStudentsForFaculty, selectedPeriod])

  const invalidateResult = useCallback(async (facultyId?: string, facultySubjectId?: string, reason?: string) => {
    if (!selectedPeriod) return
    try {
      const res = await fetch(`/api/admin/evaluation-results/invalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodId: selectedPeriod, facultyId, facultySubjectId, reason }),
      })
      if (res.status === 403) { setLockedEndpoint("/api/admin/evaluation-results/invalidate"); return }
      const data = await res.json()
      if (!data.success) throw new Error("Invalidate failed")
      // refresh
      const params = new URLSearchParams({ periodId: selectedPeriod })
      if (selectedDept) params.set("departmentId", selectedDept)
      if (showUnenrolled) params.set("source", "all")
      if (perSubject) params.set("perSubject", "1")
      const endpoint = `${apiBase}?${params}&_=${Date.now()}`
      const r2 = await fetch(endpoint)
      if (r2.status === 403) { setLockedEndpoint(endpoint); return }
      const j = await r2.json()
      setResults(j.results || [])
    } catch (e) {
      console.error(e)
      setErrorMessage("Failed to invalidate result")
    }
  }, [selectedPeriod, selectedDept, showUnenrolled, apiBase, perSubject])

  const allVisible = useMemo(() => {
    if (results.length === 0) return false
    return results.every((r) => visibilityMap[r.facultyId] === true)
  }, [results, visibilityMap])

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

  if (lockedEndpoint) {
    return (
      <div className="w-full space-y-6 pb-12 px-4 animate-ios-slide-in">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="pb-12 animate-ios-slide-in">
        {/* Header */}
        <div className="w-full px-6 pt-6">
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          <p className="text-sm text-tertiary mt-1">{subtitle}</p>
        </div>

        {errorMessage && <ErrorState message={errorMessage} onRetry={() => { setErrorMessage(""); window.location.reload() }} />}

        {!errorMessage && (
          <>
            {/* Filter Card */}
            <div className="w-full px-3 sm:px-6 pt-3 sm:pt-6">
              <div className="flex flex-wrap items-end gap-2 sm:gap-4 p-3 sm:p-5 bg-surface rounded-2xl shadow-sm">
                {showDepartmentFilter && (
                  <div className="flex flex-col gap-1 sm:gap-1.5 w-full sm:w-auto">
                    <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Department</label>
                    <select
                      value={selectedDept}
                      onChange={(e) => { setSelectedDept(e.target.value); setSelectedFaculty(null) }}
                      className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-secondary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all min-w-0 sm:min-w-[160px]"
                    >
                      <option value="">All Departments</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-col gap-1 sm:gap-1.5 w-full sm:w-auto">
                  <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Period</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full sm:w-auto px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm text-secondary bg-surface focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500 transition-all min-w-0 sm:min-w-[160px]"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.title || p.id}</option>
                    ))}
                  </select>
                </div>

              </div>
              <div className="p-6 flex flex-col gap-1 sm:gap-1.5 w-full sm:w-auto">
                {showUnenrolledToggle && (
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    <label className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-tertiary">Include Miscellaneous Evals</label>
                    <button
                      type="button"
                      onClick={() => setShowUnenrolled(!showUnenrolled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${showUnenrolled ? "bg-gold-500" : "bg-slate-300 dark:bg-slate-600"
                        }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showUnenrolled ? "translate-x-6" : "translate-x-1"
                        }`} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="w-full px-6 pt-6 space-y-6">
                <div className="flex flex-wrap items-end gap-4 p-5 bg-surface rounded-2xl shadow-sm animate-pulse">
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3 w-16 bg-surface-tertiary rounded" />
                    <div className="h-10 w-36 bg-surface-tertiary rounded-lg" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="h-3 w-16 bg-surface-tertiary rounded" />
                    <div className="h-10 w-36 bg-surface-tertiary rounded-lg" />
                  </div>
                  <div className="h-10 w-28 bg-surface-tertiary rounded-lg" />
                </div>
                <SkeletonMetricGrid count={4} />
                <div className="bg-surface rounded-xl p-4">
                  <SkeletonTable rows={7} cols={11} />
                </div>
              </div>
            ) : results.length === 0 ? (
              <p className="text-sm text-tertiary text-center pt-20">No evaluation results available for this period.</p>
            ) : (
              <div className="w-full px-6 pt-6">
                {/* Summary cards */}
                {departmentSummary && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-6">
                    <SummaryCard
                      value={departmentSummary.avg.toFixed(2)}
                      label="Average Rating"
                      color="blue"
                    />
                    <SummaryCard
                      value={departmentSummary.totalResp.toLocaleString()}
                      label="Total Respondents"
                      color="green"
                    />
                    <SummaryCard
                      value={departmentSummary.facultyCount}
                      label="Faculty Evaluated"
                      color="amber"
                    />
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 text-blue-700 p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(departmentSummary.dist).filter(([, c]) => c > 0).map(([label, count]) => (
                          <span key={label} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${getRemarkColor(label)}`}>{label}: {count}</span>
                        ))}
                      </div>
                      <p className="text-xs font-semibold uppercase tracking-wider mt-3 opacity-75">Remark Distribution</p>
                    </div>
                  </div>
                )}

                {!loading && (
                  <div className="flex flex-wrap items-center gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setShowReportModal(true)}
                      disabled={results.length === 0}
                      className="px-3 sm:px-5 py-2 rounded-lg bg-brand-500 text-white text-xs sm:text-sm font-semibold hover:bg-brand-600 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      Print Report
                    </button>
                    <div className="flex flex-wrap items-center gap-4">
                      {showVisibilityToggles && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => bulkSetVisibility(!allVisible)}
                            disabled={results.length === 0 || toggling}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${allVisible ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                              } disabled:opacity-50`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allVisible ? "translate-x-6" : "translate-x-1"
                              }`} />
                          </button>
                          <span className="text-xs sm:text-sm font-medium text-secondary">Make Reports Available to All Users</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Main table — desktop */}
                <div className="desktop-only bg-surface rounded-xl border border-default overflow-hidden tbl">
                  <div className="overflow-x-auto">
                    <table>
                      <thead>
                        <tr>
                                <th className="text-left">Faculty</th>
                                {perSubject && <th className="text-left">Subject</th>}
                          <th className="text-center whitespace-nowrap">General</th>
                          <th className="text-center whitespace-nowrap">Respondents</th>
                          <th className="text-center">Remark</th>
                          {showVisibilityToggles && <th className="text-center whitespace-nowrap">Allow User To View Results</th>}
                                <th className="text-center w-12">Actions</th>
                                <th className="text-center w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.map((r) => {
                          const name = facultyNames[r.facultyId] || r.facultyId
                          const isSelected = selectedFaculty === r.facultyId
                          return (
                            <tr key={r.id} className={`${isSelected ? "bg-brand-50 dark:bg-brand-500/10" : ""}`} onClick={() => selectFaculty(r.facultyId)}>
                              <td className="font-semibold text-primary whitespace-nowrap">{name}</td>
                              {perSubject && (
                                <td className="text-secondary max-w-xs truncate">{(r as any).facultySubjectId ?? "—"}</td>
                              )}
                              <td className="text-center font-bold text-primary">{r.generalRating !== null ? r.generalRating.toFixed(2) : "—"}</td>
                              <td className="text-center text-secondary">{r.totalRespondents}</td>
                              <td className="text-center">{r.remarks && <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(r.remarks)}`}>{r.remarks}</span>}</td>
                              {showVisibilityToggles && (
                                <td className="text-center">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleVisibility(r.facultyId, !visibilityMap[r.facultyId]) }}
                                    disabled={toggling}
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all ${visibilityMap[r.facultyId] ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" : "bg-surface-tertiary text-tertiary hover:bg-amber-100 hover:text-amber-600"
                                      } disabled:opacity-50`}
                                    title={visibilityMap[r.facultyId] ? "Visible to faculty — click to hide" : "Hidden from faculty — click to show"}
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      {visibilityMap[r.facultyId] ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                      )}
                                    </svg>
                                  </button>
                                </td>
                              )}
                              {/* <td className="text-center whitespace-nowrap">
                              <td className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setPendingInvalidate({ facultyId: r.facultyId, facultySubjectId: (r as any).facultySubjectId }); setShowReasonModal(true) }}
                                    className="inline-flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                                    title="Invalidate Result"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M10 3h4l1 4H9l1-4z" />
                                    </svg>
                                  </button>
                                </div>
                              </td>
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); printFaculty(r) }}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                                    title="Print"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); downloadFacultyPDF(r) }}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                                    title="Download PDF"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4a1 1 0 001 1h4" />
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); downloadFacultyCSV(r) }}
                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                                    title="Download CSV"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                </div>
                              </td> */}
                              <td className="text-center">
                                <svg className={`w-4 h-4 mx-auto text-tertiary transition-transform ${isSelected ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

                {/* Main table — mobile cards */}
                <div className="mobile-only space-y-3">
                      {results.map((r) => {
                    const name = facultyNames[r.facultyId] || r.facultyId
                    const isSelected = selectedFaculty === r.facultyId
                    return (
                      <div
                        key={r.id}
                        className={`rounded-xl border p-4 space-y-3 transition-all active:scale-[0.99] ${isSelected ? "bg-brand-50 dark:bg-brand-500/10 border-brand-200 dark:border-brand-700" : "bg-surface border-default"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3" onClick={() => selectFaculty(r.facultyId)}>
                          <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-primary truncate">{name}</p>
                              {perSubject && (
                                <p className="text-xs text-tertiary truncate mt-1">{(r as any).facultySubjectId ?? "—"}</p>
                              )}
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-base font-bold tabular-nums text-primary">{r.generalRating !== null ? r.generalRating.toFixed(2) : "—"}</span>
                              {r.remarks && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(r.remarks)}`}>{r.remarks}</span>
                              )}
                              <span className="text-xs text-tertiary">{r.totalRespondents} resp.</span>
                            </div>
                          </div>
                          <svg className={`w-5 h-5 mt-0.5 shrink-0 text-tertiary transition-transform ${isSelected ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); printFaculty(r) }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
                              title="Print"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); downloadFacultyPDF(r) }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Download PDF"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v4a1 1 0 001 1h4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); downloadFacultyCSV(r) }}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Download CSV"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                            </button>
                          </div>
                          {showVisibilityToggles && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleVisibility(r.facultyId, !visibilityMap[r.facultyId]) }}
                              disabled={toggling}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${visibilityMap[r.facultyId] ? "bg-emerald-100 text-emerald-700" : "bg-surface-tertiary text-tertiary"
                                } disabled:opacity-50`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                {visibilityMap[r.facultyId] ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                )}
                              </svg>
                              {visibilityMap[r.facultyId] ? "Visible" : "Hidden"}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
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
          </>
        )}
      </div>
      <ReportModal
        key={showReportModal ? "open" : "closed"}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        apiBase={apiBase}
        periods={periods}
        departments={departments}
        initialDept={selectedDept}
        initialPeriod={selectedPeriod}
        initialResults={results}
        initialFacultyNames={facultyNames}
        initialStudentData={studentData}
        initialUniqueRespondents={uniqueRespondents}
      />
      <ReasonModal
        isOpen={showReasonModal}
        title="Invalidate Evaluations"
        initialReason=""
        confirmLabel="Invalidate"
        onClose={() => { setShowReasonModal(false); setPendingInvalidate(null) }}
        onConfirm={(reason) => {
          if (pendingInvalidate) {
            invalidateResult(pendingInvalidate.facultyId, pendingInvalidate.facultySubjectId, reason)
            setPendingInvalidate(null)
          }
        }}
      />
    </ErrorBoundary>
  )
}

function DetailPanel({
  name,
  result: _result,
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

  const averages = useMemo(() => {
    if (students.length === 0) return null
    const keys = [...CATEGORIES.map((c) => c.key), "generalRating"] as const
    const sums: Record<string, number> = {}
    for (const k of keys) sums[k] = 0
    for (const s of students) {
      for (const k of keys) sums[k] += (s[k] ?? 0)
    }
    const avg: Record<string, number> = {}
    for (const k of keys) avg[k] = sums[k] / students.length
    return avg
  }, [students])

  return (
    <div className="mt-6">
      <h2 className="text-base font-bold text-primary mb-3">
        {name} — Per-Student Breakdown
        <span className="text-sm font-normal text-tertiary ml-2">({students.length} responses)</span>
      </h2>

      {loading ? (
        <div className="bg-surface rounded-xl border border-default p-4">
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
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-surface-tertiary text-tertiary">Total: {students.length}</span>
          </div>

          <div className="desktop-only overflow-x-auto bg-surface rounded-xl border border-default tbl">
            <table>
              <thead>
                <tr>
                  <th className="text-left w-10">#</th>
                  {CATEGORIES.map((c) => (
                    <th key={c.key} className="text-center min-w-14">{c.label}</th>
                  ))}
                  <th className="text-center min-w-12">Gen.</th>
                  <th className="text-left min-w-36">Comment</th>
                </tr>
              </thead>
              <tbody>
                {averages && (
                  <tr className="bg-brand-100/80 dark:bg-brand-900/30 border-t-2 border-brand-300 dark:border-brand-700 font-bold">
                    <td className="text-primary">Average</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key} className="text-center text-primary">{averages[c.key]?.toFixed(2)}</td>
                    ))}
                    <td className="text-center font-bold text-primary">{averages.generalRating?.toFixed(2)}</td>
                    <td className="text-tertiary text-xs italic">n={students.length}</td>
                  </tr>
                )}
                {slice.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold text-primary">{s.id}</td>
                    {CATEGORIES.map((c) => (
                      <td key={c.key} className="text-center text-primary">{s[c.key] !== null ? s[c.key]!.toFixed(2) : "—"}</td>
                    ))}
                    <td className="text-center font-bold text-primary">{s.generalRating !== null ? s.generalRating.toFixed(2) : "—"}</td>
                    <td className="text-tertiary max-w-48 align-top">
                      <div className="flex flex-col gap-1">
                        <SentimentBadge label={s.sentimentLabel} score={s.sentimentScore} />
                        <div className="bg-surface-muted rounded-lg px-2 py-1 text-[11px] border border-default">
                          {s.comment ? <span className="text-tertiary line-clamp-3" title={s.comment}>{s.comment}</span> : <span className="text-tertiary">—</span>}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Student breakdown — mobile cards */}
          <div className="mobile-only space-y-2">
            {averages && (
              <div className="rounded-xl bg-brand-100/80 dark:bg-brand-900/30 border-2 border-brand-300 dark:border-brand-700 p-3 space-y-2">
                <p className="text-xs font-bold text-primary">Average (n={students.length})</p>
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  {CATEGORIES.map((c) => (
                    <div key={c.key} className="text-center">
                      <p className="font-semibold text-primary">{averages[c.key]?.toFixed(2)}</p>
                      <p className="text-tertiary truncate">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-primary">Gen: {averages.generalRating?.toFixed(2)}</span>
                  <span className="text-tertiary text-[10px] font-semibold">n={students.length}</span>
                </div>
              </div>
            )}
            {slice.map((s) => (
              <div key={s.id} className="rounded-xl bg-surface border border-default p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">{s.id}</p>
                <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                  {CATEGORIES.map((c) => (
                    <div key={c.key} className="text-center">
                      <p className="font-semibold text-primary">{s[c.key] !== null ? s[c.key]!.toFixed(2) : "—"}</p>
                      <p className="text-tertiary truncate">{c.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start justify-between gap-2 text-xs">
                  <span className="font-bold text-primary shrink-0 pt-1">Gen: {s.generalRating !== null ? s.generalRating.toFixed(2) : "—"}</span>
                  <div className="flex flex-col gap-1 max-w-[60%] items-end">
                    <SentimentBadge label={s.sentimentLabel} score={s.sentimentScore} />
                    <div className="bg-surface-muted rounded-lg px-2 py-1 text-[11px] border border-default w-full">
                      {s.comment ? <span className="text-tertiary line-clamp-3" title={s.comment}>{s.comment}</span> : <span className="text-tertiary">—</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-tertiary mt-3">
              <span>Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, students.length)} of {students.length}</span>
              <div className="flex items-center gap-1">
                <button type="button" disabled={page === 0} onClick={() => onPageChange(page - 1)} className="px-3 py-1.5 rounded-md border border-default disabled:opacity-30 hover:bg-surface-hover transition-colors text-xs font-medium">Previous</button>
                {getPageButtons(page, totalPages).map((p, _i) =>
                  p === "..." ? <span key={`dot-${_i}`} className="px-1">...</span> : (
                    <button key={p} type="button" onClick={() => onPageChange(p as number)} className={`px-2.5 py-1.5 rounded-md border transition-colors text-xs font-medium ${p === page ? "bg-brand-500 text-white border-brand-500" : "border-default hover:bg-surface-hover"}`}>
                      {(p as number) + 1}
                    </button>
                  )
                )}
                <button type="button" disabled={page >= totalPages - 1} onClick={() => onPageChange(page + 1)} className="px-3 py-1.5 rounded-md border border-default disabled:opacity-30 hover:bg-surface-hover transition-colors text-xs font-medium">Next</button>
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
