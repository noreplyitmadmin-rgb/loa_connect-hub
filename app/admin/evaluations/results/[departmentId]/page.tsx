"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import ErrorState from "@/components/ui/ErrorState"
import SubmitButton from "@/components/ui/SubmitButton"
import { getRemarkColor } from "@/lib/evaluation-utils"

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

type SortKey = "facultyName" | "subjectName" | "avgRating" | "sentimentScore" | "totalRespondents"

export default function DepartmentDetailPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const departmentId = params.departmentId as string
  const semesterId = searchParams.get("semesterId") || ""

  const [department, setDepartment] = useState<DepartmentInfo | null>(null)
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("avgRating")
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!semesterId) return
    setLoading(true)
    setError("")
    fetch(`/api/admin/evaluation-results/departments/${encodeURIComponent(departmentId)}?semesterId=${encodeURIComponent(semesterId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setDepartment(data.department)
        setSubjects(data.subjects ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [departmentId, semesterId])

  const filteredSubjects = useMemo(() => {
    if (!search.trim()) return subjects
    const q = search.toLowerCase()
    return subjects.filter(
      (s) =>
        s.facultyName.toLowerCase().includes(q) ||
        s.facultyEmail.toLowerCase().includes(q) ||
        s.subjectCode.toLowerCase().includes(q) ||
        s.subjectName.toLowerCase().includes(q),
    )
  }, [subjects, search])

  const sortedSubjects = useMemo(() => {
    const sorted = [...filteredSubjects]
    sorted.sort((a, b) => {
      let aVal: number | string = a[sortKey] ?? ""
      let bVal: number | string = b[sortKey] ?? ""
      if (sortKey === "avgRating" || sortKey === "sentimentScore") {
        aVal = (a[sortKey] as number | null) ?? -1
        bVal = (b[sortKey] as number | null) ?? -1
        return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number)
      }
      if (typeof aVal === "number") {
        return sortDir === "desc" ? (bVal as number) - (aVal as number) : (aVal as number) - (bVal as number)
      }
      return sortDir === "desc"
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal))
    })
    return sorted
  }, [filteredSubjects, sortKey, sortDir])

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"))
    } else {
      setSortKey(key)
      setSortDir(key === "facultyName" || key === "subjectName" ? "asc" : "desc")
    }
  }

  const sortArrow = (key: SortKey) => {
    if (sortKey !== key) return ""
    return sortDir === "desc" ? " \u25BC" : " \u25B2"
  }

  const formatScore = (v: number | null) => (v !== null ? v.toFixed(2) : "\u2014")

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <Link
          href={`/admin/evaluations/results?semesterId=${encodeURIComponent(semesterId)}`}
          className="text-xs text-amber-600 hover:underline"
        >
          &larr; Back to Evaluation Results
        </Link>
        <h1 className="text-2xl font-bold text-primary mt-2">
          {department?.name ?? "Department"} <span className="text-tertiary font-normal">{department?.code}</span>
        </h1>
        <p className="text-xs text-tertiary mt-1">
          Per-subject evaluation results. Click a row to view individual evaluation details.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search faculty, subject..."
          className="input text-xs flex-1 max-w-xs px-3 py-2 rounded-lg border border-strong bg-surface"
        />
        <span className="text-[10px] text-tertiary">{sortedSubjects.length} subject{sortedSubjects.length !== 1 ? "s" : ""}</span>
      </div>

      {error && <ErrorState message={error} onRetry={() => window.location.reload()} />}

      {loading && (
        <div className="space-y-4">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <p className="text-sm text-tertiary text-center py-8">No evaluation data found for this department.</p>
      )}

      {!loading && subjects.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-tertiary border-b border-default">
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary" onClick={() => toggleSort("facultyName")}>
                  Faculty{sortArrow("facultyName")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary" onClick={() => toggleSort("subjectName")}>
                  Subject{sortArrow("subjectName")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("avgRating")}>
                  Avg Rating{sortArrow("avgRating")}
                </th>
                <th className="pb-3 pr-4 text-right">Highest Rubric</th>
                <th className="pb-3 pr-4 text-right">Lowest Rubric</th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("sentimentScore")}>
                  Sentiment{sortArrow("sentimentScore")}
                </th>
                <th className="pb-3 pr-4 cursor-pointer hover:text-secondary text-right" onClick={() => toggleSort("totalRespondents")}>
                  Responses{sortArrow("totalRespondents")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.map((row) => (
                <tr
                  key={row.facultySubjectId}
                  onClick={() =>
                    router.push(
                      `/admin/evaluations/results/${departmentId}/${row.facultySubjectId}?semesterId=${encodeURIComponent(semesterId)}`,
                    )
                  }
                  className="border-b border-default hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-primary">{row.facultyName}</span>
                      <span className="text-[10px] text-tertiary">{row.facultyEmail}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="text-sm text-secondary">{row.subjectCode} {row.subjectName}</span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <span className="text-sm font-bold">{formatScore(row.avgRating)}</span>
                    {row.remarks && (
                      <span className={`ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full ${getRemarkColor(row.remarks)}`}>
                        {row.remarks}
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.highestRubrics.length > 0 && (
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                        {row.highestRubrics[0].label} ({formatScore(row.highestRubrics[0].score)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.lowestRubrics.length > 0 && (
                      <span className="text-[11px] text-red-600 dark:text-red-400">
                        {row.lowestRubrics[0].label} ({formatScore(row.lowestRubrics[0].score)})
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {row.sentimentScore !== null ? (
                      <span className={`text-[11px] font-semibold ${
                        row.sentimentScore >= 0.05 ? "text-emerald-600 dark:text-emerald-400" :
                        row.sentimentScore <= -0.05 ? "text-red-600 dark:text-red-400" :
                        "text-amber-600 dark:text-amber-400"
                      }`}>
                        {row.sentimentScore.toFixed(4)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-tertiary">&mdash;</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-right text-sm text-secondary">{row.totalRespondents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
