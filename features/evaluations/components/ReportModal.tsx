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
    Promise.resolve().then(() => {
      setSelectedId("")
      setFacultySearch("")
    })
  }, [periodId, deptId])

  // Fetch results when period or dept changes
  useEffect(() => {
    if (!periodId || !isOpen) return
    if (periodId === initialPeriod && deptId === initialDept) {
      // Use initial data if filters match dashboard
      Promise.resolve().then(() => {
        setResults(initialResults)
        setFacultyNames(initialFacultyNames)
        setFacultyStudentData(initialStudentData)
      })
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
    Promise.resolve().then(() => {
      fetchStudentDetails(selectedId)
      fetchSubjects(selectedId)
    })
  }, [selectedId, fetchStudentDetails, fetchSubjects])

  // Results are already filtered by department server-side via the API
  const deptResults = results

  // Filtered faculty list for search
  const filteredFaculty = useMemo(() => {
    const list = results
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

  // ── Print handlers ──────────────────────────────────────────

  const handleGeneratePDF = useCallback(async () => {
    const { jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
    const doc = new jsPDF("portrait")
    const pageW = doc.internal.pageSize.getWidth()

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

    if (tab === "department") {
      const deptAvg = deptResults.length > 0
        ? deptResults.reduce((s, r) => s + (r.generalRating ?? 0), 0) / deptResults.length
        : 0
      const totalResp = deptResults.reduce((s, r) => s + r.totalRespondents, 0)

      doc.setFontSize(11)
      doc.text("DEPARTMENT EVALUATION REPORT", pageW / 2, y, { align: "center" })
      y += 9
      doc.setFontSize(8)
      doc.text(`Department: ${departmentName || "All Departments"}`, 14, y)
      y += 4.5
      doc.text(`Semester: ${periodName}`, 14, y)
      y += 4.5
      doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y)
      y += 8

      // Metrics
      doc.setFontSize(8)
      doc.text(`Faculties Evaluated: ${deptResults.length}`, pageW / 2, y, { align: "center" })
      y += 5
      doc.text(`Department Average: ${deptAvg.toFixed(2)}`, pageW / 2, y, { align: "center" })
      y += 5
      doc.text(`Total Respondents: ${totalResp.toLocaleString()}`, pageW / 2, y, { align: "center" })
      y += 8

      const dHead = [["Faculty", "General Rating", "Respondents", "Remark"]]
      const dBody = deptResults.map((r) => [
        facultyNames[r.facultyId] || r.facultyId,
        r.generalRating?.toFixed(2) ?? "—",
        String(r.totalRespondents),
        r.remarks ?? "—",
      ])

      autoTable(doc, {
        startY: y,
        head: dHead,
        body: dBody,
        theme: "grid",
        styles: { fontSize: 8, cellPadding: 2, halign: "center" },
        headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
        columnStyles: { 0: { halign: "left" } },
        tableWidth: "auto",
        margin: { left: 14, right: 14 },
      })
    } else if (tab === "individual") {
      if (selectedResult) {
        const overall = selectedResult.generalRating ?? 0
        const remarkLabel = getRemark(overall) ?? ""

        doc.setFontSize(11)
        doc.text("INDIVIDUAL FACULTY EVALUATION REPORT", pageW / 2, y, { align: "center" })
        y += 9
        doc.setFontSize(8)
        doc.text(`Name: ${facultyNames[selectedResult.facultyId] || selectedResult.facultyId}`, 14, y)
        y += 4.5
        doc.text(`Semester: ${periodName}`, 14, y)
        y += 4.5
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y)
        y += 8

        const iHead = [["#", "Category", "Rating"]]
        const iBody: (string | number)[][] = [
          ["0", "OVERALL EVALUATION RESULT", overall.toFixed(2)],
        ]
        CATEGORIES_FULL.forEach((c, i) => {
          iBody.push([String(i + 1), c.label, selectedResult[c.key] !== null ? selectedResult[c.key]!.toFixed(2) : "—"])
        })

        autoTable(doc, {
          startY: y,
          head: iHead,
          body: iBody,
          theme: "grid",
          styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
          headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
          columnStyles: { 1: { halign: "left", fontStyle: "bold" } },
          tableWidth: "auto",
          margin: { left: 20, right: 20 },
        })
        y = doc.lastAutoTable.finalY + 8

        doc.setFontSize(9)
        doc.text("Overall Rating", pageW / 2, y, { align: "center" })
        y += 5
        doc.setFontSize(10)
        doc.text(`${overall.toFixed(2)} / 5.00 – ${remarkLabel}`, pageW / 2, y, { align: "center" })
        y += 8

        const comments = selectedStudents.filter((s) => s.comment?.trim())
        if (comments.length > 0) {
          doc.setFontSize(9)
          doc.text("Student Comment", pageW / 2, y, { align: "center" })
          y += 5
          doc.setFontSize(8)

          const maxShow = Math.min(comments.length, 30)
          for (let i = 0; i < maxShow; i++) {
            if (y > 260) { doc.addPage(); y = 20 }
            const text = `"${comments[i].comment!.trim()}"`
            const lines = doc.splitTextToSize(text, pageW - 50)
            doc.text(lines, 25, y)
            y += lines.length * 3.5 + 3
          }
          if (comments.length > 30) {
            doc.text(`... and ${comments.length - 30} more comments`, 25, y)
            y += 5
          }
          y += 2
        }

        if (y > 240) { doc.addPage(); y = 20 }
        doc.setFontSize(9)
        doc.text("Interpretation", pageW / 2, y, { align: "center" })
        y += 5
        doc.setFontSize(8)

        const sentLabels = comments.map((c) => c.sentimentLabel).filter(Boolean)
        const posCount = sentLabels.filter((l) => l === "positive").length
        const negCount = sentLabels.filter((l) => l === "negative").length
        const neutralCount = sentLabels.filter((l) => l === "neutral").length
        const hasComments = comments.length > 0

        let interp = `The instructor received an overall rating of ${overall.toFixed(2)}, indicating a ${remarkLabel.toLowerCase()} level of performance. `
        if (hasComments && posCount > negCount && posCount > 0) {
          interp += `Student feedback was predominantly positive (${Math.round((posCount / comments.length) * 100)}% of comments), with many students expressing appreciation for the instructor's teaching approach and classroom management. `
        } else if (hasComments && negCount > posCount && negCount > 0) {
          interp += `Some students provided critical feedback (${Math.round((negCount / comments.length) * 100)}% of comments), suggesting areas for improvement in instructional delivery and student engagement. `
        }
        if (hasComments && neutralCount > 0) {
          interp += `A portion of comments were neutral or mixed, reflecting balanced perspectives on the instructor's overall effectiveness. `
        }
        interp += `The results reflect the collective assessment of ${selectedResult.totalRespondents} student respondent(s).`

        const interpLines = doc.splitTextToSize(interp, pageW - 50)
        doc.text(interpLines, 25, y)
      } else {
        // Loop over all faculty — full individual report per faculty
        const renderFacultyReport = async (r: Result, isFirst: boolean) => {
          const overall = r.generalRating ?? 0
          const remarkLabel = getRemark(overall) ?? ""
          const students = facultyStudentData[r.facultyId] || []

          if (!isFirst) {
            doc.addPage()
            // Re-draw header on new page
            const logoY2 = 12
            const logoWidth2 = 28
            let logoHeight2 = 28
            try {
              const resp2 = await fetch("/logo-blk.png")
              const blob2 = await resp2.blob()
              const logoData2 = await new Promise<string>((resolve) => {
                const reader2 = new FileReader()
                reader2.onloadend = () => resolve(reader2.result as string)
                reader2.readAsDataURL(blob2)
              })
              const img2 = new Image()
              await new Promise<void>((resolve2, reject2) => {
                img2.onload = () => resolve2()
                img2.onerror = reject2
                img2.src = logoData2
              })
              logoHeight2 = logoWidth2 * (img2.naturalHeight / img2.naturalWidth)
              doc.addImage(logoData2, "PNG", (pageW - logoWidth2) / 2, logoY2, logoWidth2, logoHeight2)
            } catch { /* skip logo */ }

            const addrY2 = logoY2 + logoHeight2 + 3
            doc.setFontSize(7)
            doc.text("Main Bldg. Km. 30 National Road, Tunasan, Muntinlupa City", pageW / 2, addrY2, { align: "center" })
            const lineY2 = addrY2 + 5
            doc.setDrawColor(180, 180, 180)
            doc.line(14, lineY2, pageW - 14, lineY2)
            doc.setDrawColor(0, 0, 0)
            y = lineY2 + 6
          }

          doc.setFontSize(11)
          doc.text("INDIVIDUAL FACULTY EVALUATION REPORT", pageW / 2, y, { align: "center" })
          y += 9
          doc.setFontSize(8)
          doc.text(`Name: ${facultyNames[r.facultyId] || r.facultyId}`, 14, y)
          y += 4.5
          doc.text(`Semester: ${periodName}`, 14, y)
          y += 4.5
          doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, y)
          y += 8

          const iHead = [["#", "Category", "Rating"]]
          const iBody: (string | number)[][] = [
            ["0", "OVERALL EVALUATION RESULT", overall.toFixed(2)],
          ]
          CATEGORIES_FULL.forEach((c, i) => {
            iBody.push([String(i + 1), c.label, r[c.key] !== null ? r[c.key]!.toFixed(2) : "—"])
          })

          autoTable(doc, {
            startY: y,
            head: iHead,
            body: iBody,
            theme: "grid",
            styles: { fontSize: 9, cellPadding: 2.5, halign: "center" },
            headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
            columnStyles: { 1: { halign: "left", fontStyle: "bold" } },
            tableWidth: "auto",
            margin: { left: 20, right: 20 },
          })
          y = doc.lastAutoTable.finalY + 8

          doc.setFontSize(9)
          doc.text("Overall Rating", pageW / 2, y, { align: "center" })
          y += 5
          doc.setFontSize(10)
          doc.text(`${overall.toFixed(2)} / 5.00 – ${remarkLabel}`, pageW / 2, y, { align: "center" })
          y += 8

          const comments = students.filter((s) => s.comment?.trim())
          if (comments.length > 0) {
            doc.setFontSize(9)
            doc.text("Student Comment", pageW / 2, y, { align: "center" })
            y += 5
            doc.setFontSize(8)

            const maxShow = Math.min(comments.length, 30)
            for (let i = 0; i < maxShow; i++) {
              if (y > 260) { doc.addPage(); y = 20 }
              const text = `"${comments[i].comment!.trim()}"`
              const lines = doc.splitTextToSize(text, pageW - 50)
              doc.text(lines, 25, y)
              y += lines.length * 3.5 + 3
            }
            if (comments.length > 30) {
              doc.text(`... and ${comments.length - 30} more comments`, 25, y)
              y += 5
            }
            y += 2
          }

          if (y > 240) { doc.addPage(); y = 20 }
          doc.setFontSize(9)
          doc.text("Interpretation", pageW / 2, y, { align: "center" })
          y += 5
          doc.setFontSize(8)

          const sentLabels = comments.map((c) => c.sentimentLabel).filter(Boolean)
          const posCount = sentLabels.filter((l) => l === "positive").length
          const negCount = sentLabels.filter((l) => l === "negative").length
          const neutralCount = sentLabels.filter((l) => l === "neutral").length
          const hasComments = comments.length > 0

          let interp = `The instructor received an overall rating of ${overall.toFixed(2)}, indicating a ${remarkLabel.toLowerCase()} level of performance. `
          if (hasComments && posCount > negCount && posCount > 0) {
            interp += `Student feedback was predominantly positive (${Math.round((posCount / comments.length) * 100)}% of comments), with many students expressing appreciation for the instructor's teaching approach and classroom management. `
          } else if (hasComments && negCount > posCount && negCount > 0) {
            interp += `Some students provided critical feedback (${Math.round((negCount / comments.length) * 100)}% of comments), suggesting areas for improvement in instructional delivery and student engagement. `
          }
          if (hasComments && neutralCount > 0) {
            interp += `A portion of comments were neutral or mixed, reflecting balanced perspectives on the instructor's overall effectiveness. `
          }
          interp += `The results reflect the collective assessment of ${r.totalRespondents} student respondent(s).`

          const interpLines = doc.splitTextToSize(interp, pageW - 50)
          doc.text(interpLines, 25, y)
        }

        // Render first faculty on current page, rest on new pages
        await renderFacultyReport(results[0], true)
        for (let i = 1; i < results.length; i++) {
          await renderFacultyReport(results[i], false)
        }
      }
    }

    doc.autoPrint()
    doc.output("dataurlnewwindow")
  }, [tab, deptResults, periodName, departmentName, facultyNames, selectedResult, selectedStudents, results, facultyStudentData])

  const handlePrintHTML = useCallback(() => {
    window.print()
  }, [])

  const handleExportCSV = useCallback(() => {
    if (tab === "department") {
      const rows = [["Faculty", "General Rating", "Respondents", "Remark"]]
      deptResults.forEach((r) => {
        rows.push([
          facultyNames[r.facultyId] || r.facultyId,
          r.generalRating?.toFixed(2) ?? "—",
          String(r.totalRespondents),
          r.remarks ?? "—",
        ])
      })
      const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `department-evaluation-${periodName.replace(/[\s/]+/g, "-")}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } else if (tab === "individual") {
      if (selectedResult) {
        const fn = facultyNames[selectedResult.facultyId] || selectedResult.facultyId
        const rows = [["#", "Category", "Rating"]]
        rows.push(["0", "OVERALL EVALUATION RESULT", selectedResult.generalRating?.toFixed(2) ?? "—"])
        CATEGORIES_FULL.forEach((c, i) => {
          rows.push([String(i + 1), c.label, selectedResult[c.key] !== null ? selectedResult[c.key]!.toFixed(2) : "—"])
        })
        rows.push([])
        rows.push(["Student Comment", "Sentiment"])
        selectedStudents.filter((s) => s.comment?.trim()).forEach((s) => {
          rows.push([s.comment!.trim(), s.sentimentLabel ?? ""])
        })
        const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `faculty-evaluation-${fn.replace(/[\s/]+/g, "-")}.csv`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        // Full individual reports for all faculty in one CSV
        const allRows: string[][] = []
        results.forEach((r, idx) => {
          if (idx > 0) allRows.push([])
          const fn = facultyNames[r.facultyId] || r.facultyId
          allRows.push([`Faculty: ${fn}`])
          allRows.push(["#", "Category", "Rating"])
          allRows.push(["0", "OVERALL EVALUATION RESULT", r.generalRating?.toFixed(2) ?? "—"])
          CATEGORIES_FULL.forEach((c, i) => {
            allRows.push([String(i + 1), c.label, r[c.key] !== null ? r[c.key]!.toFixed(2) : "—"])
          })
          const students = facultyStudentData[r.facultyId] || []
          const comments = students.filter((s) => s.comment?.trim())
          if (comments.length > 0) {
            allRows.push([])
            allRows.push(["Student Comment", "Sentiment"])
            comments.forEach((s) => {
              allRows.push([s.comment!.trim(), s.sentimentLabel ?? ""])
            })
          }
        })
        const csv = allRows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `individual-evaluation-all-${periodName.replace(/[\s/]+/g, "-")}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    }
  }, [tab, deptResults, facultyNames, periodName, selectedResult, selectedStudents, results, facultyStudentData])

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
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleGeneratePDF}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-white bg-brand-500 hover:bg-brand-600 transition-all"
            >
              Print PDF
            </button>
            <button
              type="button"
              onClick={handlePrintHTML}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-tertiary border border-default hover:bg-surface-muted hover:text-secondary transition-all"
            >
              Print HTML
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-tertiary border border-default hover:bg-surface-muted hover:text-secondary transition-all"
            >
              Print CSV
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-tertiary hover:text-secondary hover:bg-surface-muted transition-all"
            >
              Close
            </button>
          </div>
        </div>

        {/* Filters bar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 border-b border-default bg-surface-muted/30">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">Semester</label>
              <select
                value={periodId}
                onChange={(e) => { setPeriodId(e.target.value); setDeptId("") }}
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

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {tab === "department" ? (
            fetching ? (
              <div className="text-center py-10 text-sm text-tertiary">Loading...</div>
            ) : results.length === 0 ? (
              <div className="text-center py-10 text-sm text-tertiary">No evaluation results available.</div>
            ) : (
              <DepartmentView
                departmentName={departmentName}
                periodName={periodName}
                results={deptResults}
                facultyNames={facultyNames}
              />
            )
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
                      onChange={(e) => { setFacultySearch(e.target.value); if (!e.target.value) setSelectedId(""); setShowDropdown(true) }}
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

                  {/* Summary table when no faculty selected */}
                  {!selectedId && results.length > 0 && (
                    <div className="border border-default rounded-xl overflow-hidden">
                      <div className="w-full overflow-x-auto">
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
                              const fn = facultyNames[r.facultyId] || r.facultyId
                              return (
                                <tr key={r.id} className="hover:bg-surface-muted/50">
                                  <td className="px-4 py-2.5 font-medium text-primary">{fn}</td>
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
                  )}

                  {/* Selected faculty report */}
                  {selectedResult ? (
                    <IndividualPreview
                      result={selectedResult}
                      name={facultyNames[selectedResult.facultyId] || selectedResult.facultyId}
                      students={selectedStudents}
                      subjects={selectedSubjects}
                    />
                  ) : !selectedId ? null : (
                    <div className="text-center py-10 text-sm text-tertiary">
                      No data available for this faculty member.
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
