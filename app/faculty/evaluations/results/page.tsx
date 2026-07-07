"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Skeleton from "@/components/ui/Skeleton"
import { getRemarkColor } from "@/lib/evaluation-utils"

interface SubjectRow {
  facultySubjectId: string
  subjectCode: string
  subjectName: string
  totalRespondents: number
  avgRating: number | null
  remarks: string | null
  highestRubrics: { key: string; label: string; score: number }[]
  lowestRubrics: { key: string; label: string; score: number }[]
  sentimentScore: number | null
}

interface Period {
  id: string
  title?: string
  name?: string
}

export default function FacultyEvaluationResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const semesterId = searchParams.get("semesterId")

  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedSemester, setSelectedSemester] = useState(semesterId ?? "")
  const [subjects, setSubjects] = useState<SubjectRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/evaluation-periods")
      .then((r) => r.json())
      .then((data) => {
        const list: Period[] = data.periods ?? data ?? []
        setPeriods(list)
        if (!semesterId) {
          const active = list.find((p) => p.title?.toLowerCase().includes("active") || p.name?.toLowerCase().includes("active"))
          if (active) {
            setSelectedSemester(active.id)
            router.replace(`/faculty/evaluations/results?semesterId=${encodeURIComponent(active.id)}`)
          }
        }
      })
      .catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedSemester) return
    setLoading(true)
    setError("")
    fetch(`/api/faculty/evaluation-results/subjects?semesterId=${encodeURIComponent(selectedSemester)}`)
      .then(async (r) => {
        if (r.status === 403) {
          const body = await r.json()
          throw new Error(body.error || "Results are not visible yet")
        }
        return r.json()
      })
      .then((data) => {
        if (data.error) throw new Error(data.error)
        setSubjects(data.subjects ?? [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [selectedSemester])

  const handlePeriodChange = (id: string) => {
    setSelectedSemester(id)
    router.replace(`/faculty/evaluations/results?semesterId=${encodeURIComponent(id)}`)
  }

  const formatScore = (v: number | null) => (v !== null ? v.toFixed(2) : "\u2014")

  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-primary">My Evaluation Results</h1>
        <p className="text-xs text-tertiary mt-1">
          Per-subject evaluation breakdown. Click a row to view individual responses.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-secondary">Period</label>
        <select
          value={selectedSemester}
          onChange={(e) => handlePeriodChange(e.target.value)}
          className="input text-xs px-3 py-2 rounded-lg border border-strong bg-surface"
        >
          <option value="">Select a period...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.title || p.name || p.id}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="card p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton variant="table-row" />
          <Skeleton variant="table-row" />
        </div>
      )}

      {!loading && !error && subjects.length === 0 && selectedSemester && (
        <p className="text-sm text-tertiary text-center py-8">No evaluation data found for this period.</p>
      )}

      {!loading && subjects.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-tertiary border-b border-default">
                <th className="pb-3 pr-4">Subject</th>
                <th className="pb-3 pr-4 text-right">Avg Rating</th>
                <th className="pb-3 pr-4 text-right">Highest Rubric</th>
                <th className="pb-3 pr-4 text-right">Lowest Rubric</th>
                <th className="pb-3 pr-4 text-right">Sentiment</th>
                <th className="pb-3 pr-4 text-right">Responses</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((row) => (
                <tr
                  key={row.facultySubjectId}
                  onClick={() =>
                    router.push(
                      `/faculty/evaluations/results/${row.facultySubjectId}?semesterId=${encodeURIComponent(selectedSemester)}`,
                    )
                  }
                  className="border-b border-default hover:bg-surface-hover cursor-pointer transition-colors"
                >
                  <td className="py-3 pr-4">
                    <span className="text-sm font-semibold text-primary">{row.subjectCode} {row.subjectName}</span>
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
                      <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
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
