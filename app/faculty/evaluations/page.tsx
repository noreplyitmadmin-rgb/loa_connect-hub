"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import Skeleton from "@/components/ui/Skeleton"
import { SkeletonCard } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"
import { useApiGet, invalidate } from "@/lib/api/client"
import { EVALUATION_CATEGORIES } from "@/features/evaluations/constants"
import { formatPeriodLabel } from "@/lib/evaluation-utils"

interface Period {
  id: string
  name?: string
  title?: string
  isActive?: boolean
  semesterTitle?: string
}

interface FacultyResult {
  id: string
  semesterId: string
  facultyId: string
  generalRating: number | null
  remarks: string | null
  totalRespondents: number
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
}

interface FacultyResultsResponse {
  results: FacultyResult[]
}

const CATEGORIES = EVALUATION_CATEGORIES

function getRemarkColor(remarks: string | null): string {
  switch (remarks) {
    case "Outstanding": return "text-emerald-600 bg-emerald-50"
    case "Very Satisfactory": return "text-blue-600 bg-blue-50"
    case "Satisfactory": return "text-amber-600 bg-amber-50"
    case "Unsatisfactory": return "text-red-600 bg-red-50"
    case "Poor": return "text-red-700 bg-red-100"
    default: return "text-tertiary bg-slate-50"
  }
}

export default function FacultyEvaluationsPage() {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("")

  const { data: periodsData, error: periodsError } = useApiGet<{ periods: Period[] }>("/api/evaluation-periods")
  const periods = useMemo(() => periodsData?.periods ?? [], [periodsData])
  const loading = !periodsData && !periodsError

  useEffect(() => {
    if (periods.length > 0 && !selectedPeriodId) {
      const active = periods.find((p: Period) => p.isActive)
      if (active) Promise.resolve().then(() => setSelectedPeriodId(active.id))
    }
  }, [periods, selectedPeriodId])

  const { data: resultData, error: resultError } = useApiGet<FacultyResultsResponse>(
    selectedPeriodId ? `/api/faculty/evaluation-results?periodId=${selectedPeriodId}` : null,
  )
  const result = resultData?.results?.[0] ?? null

  const lockedEndpoint = periodsError?.message?.includes("403")
    ? "/api/evaluation-periods"
    : resultError?.message?.includes("403")
      ? `/api/faculty/evaluation-results?periodId=${selectedPeriodId}`
      : ""
  const errorMessage = (!periodsError?.message?.includes("403") && periodsError?.message) || (!resultError?.message?.includes("403") && resultError?.message) || ""

  if (loading) {
    return (
      <div className="pb-12 space-y-6">
        <Skeleton variant="text" className="w-48 h-7" />
        <Skeleton variant="text" className="w-64 h-4" />
        <SkeletonCard count={2} />
      </div>
    )
  }

  if (lockedEndpoint) {
    return (
      <div className="w-full pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  if (errorMessage) {
    return (
      <div className="w-full pb-12">
        <ErrorState message={errorMessage} onRetry={() => { invalidate("/api/evaluation-periods"); invalidate(`/api/faculty/evaluation-results?periodId=${selectedPeriodId}`) }} />
      </div>
    )
  }

  return (
    <ErrorBoundary>
    <div className="w-full space-y-8 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-primary">My Evaluation Results</h1>
          <p className="text-sm text-tertiary mt-1">Ratings from student evaluations</p>
        </div>
        <select
          value={selectedPeriodId}
          onChange={(e) => setSelectedPeriodId(e.target.value)}
          className="text-sm rounded-lg border border-slate-200 bg-white px-3 py-2 text-primary"
        >
          <option value="">Select period...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{formatPeriodLabel(p)}</option>
          ))}
        </select>
      </div>

      {!result ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-sm text-tertiary">
            {selectedPeriodId ? "No results available for this period." : "Select a period to view results."}
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
            <p className="text-xs text-tertiary uppercase tracking-wider font-semibold">General Rating</p>
            <p className="text-5xl font-bold text-primary mt-2">
              {result.generalRating !== null ? result.generalRating.toFixed(2) : "N/A"}
            </p>
            {result.remarks && (
              <span className={`inline-block mt-2 text-xs font-bold px-3 py-1 rounded-full ${getRemarkColor(result.remarks)}`}>
                {result.remarks}
              </span>
            )}
            <p className="text-xs text-tertiary mt-3">{result.totalRespondents} student{result.totalRespondents !== 1 ? "s" : ""} responded</p>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-primary">Category Breakdown</h3>
            {CATEGORIES.map((cat) => {
              const val = (result as unknown as Record<string, number | null>)[cat.key]
              return (
                <div key={cat.key} className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-primary font-medium">{cat.label}</span>
                    <span className="text-sm font-bold text-primary">{val !== null ? val.toFixed(2) : "—"}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-gold-400 to-emerald-500 transition-all duration-700"
                      style={{ width: `${val !== null ? (val / 5) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Link
              href={`/faculty/evaluations/${selectedPeriodId}`}
              className="text-sm font-semibold text-blue-600 border border-blue-200 rounded-lg px-4 py-2 hover:bg-blue-50 transition-colors"
            >
              View Student Breakdown
            </Link>
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  )
}
