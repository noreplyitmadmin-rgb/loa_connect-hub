"use client"

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useSearchParams } from "next/navigation"
import Skeleton from "@/components/ui/Skeleton"
import { getRemarkColor } from "@/lib/evaluation-utils"
import { downloadDeptPdf } from "@/lib/evaluation-pdf"
import DepartmentSubjectView from "@/features/evaluations/components/DepartmentSubjectView"

interface SubjectRow {
  facultySubjectId: string
  facultyId: string
  facultyName: string
  facultyEmail: string
  subjectId: string
  subjectCode: string
  subjectName: string
  totalRespondents: number
  avgRating: number | null
  remarks: string | null
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  highestRubrics: { key: string; label: string; score: number }[]
  lowestRubrics: { key: string; label: string; score: number }[]
  sentimentScore: number | null
}

interface DepartmentInfo {
  id: string
  name: string
  code: string
}

export default function DeanDepartmentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const departmentId = params.departmentId as string
  const semesterId = searchParams.get("semesterId") || ""

  const [department, setDepartment] = useState<DepartmentInfo | null>(null)
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [pdfMode, setPdfMode] = useState<"per_subject" | "per_faculty">("per_subject")

  const deptMetrics = useMemo(() => {
    if (subjects.length === 0) return null
    const uniqueFaculty = new Set(subjects.map((s) => s.facultyId)).size
    const totalResp = subjects.reduce((sum, s) => sum + s.totalRespondents, 0)
    const ratings = subjects.filter((s) => s.avgRating !== null).map((s) => s.avgRating as number)
    const deptAvg = ratings.length > 0
      ? Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length * 100) / 100
      : null
    const deptRemark = deptAvg !== null
      ? (deptAvg >= 4.5 ? "Outstanding" : deptAvg >= 3.5 ? "Very Satisfactory" : deptAvg >= 2.5 ? "Satisfactory" : deptAvg >= 1.5 ? "Unsatisfactory" : "Poor")
      : null

    const rubricSums: Record<string, { sum: number; count: number }> = {}
    for (const s of subjects) {
      for (const key of ["professionalManner", "communicationWithStudent", "studentEngagement", "learningMaterials", "timeManagement", "experientialLearning", "respectUniqueness", "assessmentAndFeedback"] as const) {
        const val = s[key as keyof typeof s] as number | null
        if (val !== null) {
          if (!rubricSums[key]) rubricSums[key] = { sum: 0, count: 0 }
          rubricSums[key].sum += val
          rubricSums[key].count += 1
        }
      }
    }
    const rubricAvgs: { key: string; label: string; score: number }[] = Object.entries(rubricSums).map(([key, { sum, count }]) => ({
      key,
      label: key === "professionalManner" ? "Professional Manner"
        : key === "communicationWithStudent" ? "Communication w/ Students"
        : key === "studentEngagement" ? "Student Engagement"
        : key === "learningMaterials" ? "Learning Materials"
        : key === "timeManagement" ? "Time Management"
        : key === "experientialLearning" ? "Experiential Learning"
        : key === "respectUniqueness" ? "Respect for Uniqueness"
        : "Assessment & Feedback",
      score: Math.round(sum / count * 100) / 100,
    }))
    const highest = [...rubricAvgs].sort((a, b) => b.score - a.score).slice(0, 1)
    const lowest = [...rubricAvgs].sort((a, b) => a.score - b.score).slice(0, 1)

    const sentiments = subjects.filter((s) => s.sentimentScore !== null).map((s) => s.sentimentScore as number)
    const overallSentiment = sentiments.length > 0
      ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length * 100) / 100
      : null

    return {
      totalSubjects: subjects.length,
      uniqueFaculty,
      totalResp,
      deptAvg,
      deptRemark,
      highest,
      lowest,
      overallSentiment,
    }
  }, [subjects])

  const handleDeptPdf = useCallback(() => {
    if (!department || subjects.length === 0) return
    downloadDeptPdf({
      departmentName: department.name,
      departmentCode: department.code,
      subjects: subjects.map((s) => ({
        facultyName: s.facultyName,
        facultyEmail: s.facultyEmail,
        subjectCode: s.subjectCode,
        subjectName: s.subjectName,
        totalRespondents: s.totalRespondents,
        avgRating: s.avgRating,
        remarks: s.remarks,
        highestRubrics: s.highestRubrics,
        lowestRubrics: s.lowestRubrics,
        sentimentScore: s.sentimentScore,
      })),
      mode: pdfMode,
    })
  }, [department, subjects, pdfMode])

  useEffect(() => {
    if (!semesterId) return
    setLoading(true)
    setError("")
    fetch(`/api/dean/evaluation-results/departments/${encodeURIComponent(departmentId)}?semesterId=${encodeURIComponent(semesterId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setDepartment(data.department)
        setSubjects(data.subjects ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [departmentId, semesterId])

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary">
          {department?.name ?? "Department"} <span className="text-tertiary font-normal">{department?.code}</span>
        </h1>
        <p className="text-xs text-tertiary mt-1">
          Per-subject evaluation results. Click a row to view individual evaluation details.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {loading && (
        <div className="space-y-4">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <p className="text-sm text-tertiary text-center py-8">No evaluation data found for this department.</p>
      )}

      {!loading && subjects.length > 0 && deptMetrics && (
        <>
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-secondary">Department Summary</p>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-default overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setPdfMode("per_subject")}
                    className={`px-3 py-1.5 transition-colors ${pdfMode === "per_subject" ? "bg-blue-600 text-white" : "bg-surface text-tertiary hover:text-secondary"}`}
                  >
                    Per Subject
                  </button>
                  <button
                    type="button"
                    onClick={() => setPdfMode("per_faculty")}
                    className={`px-3 py-1.5 transition-colors ${pdfMode === "per_faculty" ? "bg-blue-600 text-white" : "bg-surface text-tertiary hover:text-secondary"}`}
                  >
                    Per Faculty
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleDeptPdf}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Download PDF
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-[10px] text-tertiary">Subjects</p>
                <p className="text-lg font-bold">{deptMetrics.totalSubjects}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Faculty</p>
                <p className="text-lg font-bold">{deptMetrics.uniqueFaculty}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Total Respondents</p>
                <p className="text-lg font-bold">{deptMetrics.totalResp}</p>
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Department Average</p>
                <p className="text-lg font-bold">{deptMetrics.deptAvg?.toFixed(2) ?? "\u2014"}</p>
                {deptMetrics.deptRemark && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(deptMetrics.deptRemark)}`}>
                    {deptMetrics.deptRemark}
                  </span>
                )}
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Highest Rubric</p>
                {deptMetrics.highest.map((r) => (
                  <p key={r.key} className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                    {r.label}: {r.score.toFixed(2)}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Lowest Rubric</p>
                {deptMetrics.lowest.map((r) => (
                  <p key={r.key} className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {r.label}: {r.score.toFixed(2)}
                  </p>
                ))}
              </div>
              <div>
                <p className="text-[10px] text-tertiary">Overall Sentiment</p>
                <p className="text-sm font-semibold">
                  {deptMetrics.overallSentiment !== null ? deptMetrics.overallSentiment.toFixed(4) : "\u2014"}
                </p>
              </div>
            </div>
          </div>

          <DepartmentSubjectView
            subjects={subjects}
            departmentId={departmentId}
            semesterId={semesterId}
            search={search}
            onSearchChange={setSearch}
            basePath="/dean/evaluations/results"
          />
        </>
      )}
    </div>
  )
}
