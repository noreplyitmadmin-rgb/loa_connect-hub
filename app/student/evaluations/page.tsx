"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Skeleton from "@/components/ui/Skeleton"
import { SkeletonCard } from "@/components/ui/Skeleton"

interface PendingItem {
  evaluateeId: string
  evaluateeName: string
  evaluateeEmail: string
}

interface ExistingEvaluation {
  id: string
  evaluateeId: string
  evaluateeName: string
  status: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function StudentEvaluationsPage() {
  const router = useRouter()
  const [pending, setPending] = useState<PendingItem[]>([])
  const [evaluations, setEvaluations] = useState<ExistingEvaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const [pendingRes, evalRes] = await Promise.all([
          fetch("/api/evaluations/pending"),
          fetch("/api/evaluations"),
        ])
        const [pendingData, evalData] = await Promise.all([pendingRes.json(), evalRes.json()])
        setPending(pendingData.pending || [])
        setEvaluations(evalData.evaluations || [])

        fetch("/api/evaluation-periods")
          .then((r) => r.json())
          .then((periodData) => {
            const active = (periodData.periods || []).find((p: { isActive: boolean }) => p.isActive)
            if (active) {
              fetch(`/api/evaluation-periods/${active.id}/rubric`)
                .then((r) => r.json())
                .then((rubricData) => {
                  if (rubricData.rubric) {
                    sessionStorage.setItem("eval_rubric_cache", JSON.stringify({ categories: rubricData.rubric, fetchedAt: Date.now() }))
                  }
                })
                .catch(() => {})
            }
          })
          .catch(() => {})
      } catch {
        alert("Failed to load evaluations")
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const total = pending.length + evaluations.length
  const completed = evaluations.length

  if (loading) {
    return (
      <div className="pb-12 px-5 pt-8">
        <Skeleton variant="text" className="w-1/3 h-7 mb-2" />
        <Skeleton variant="text" className="w-1/4 h-4 mb-6" />
        <SkeletonCard count={3} />
      </div>
    )
  }

  return (
    <div className="pb-12">
      <div className="px-5 pt-8 pb-2">
        <h1 className="text-[28px] font-bold text-primary tracking-tight">Evaluations</h1>
        <p className="text-sm text-tertiary mt-1">
          {completed} of {total} completed
        </p>
      </div>

      {total > 0 && (
        <div className="px-5 py-3">
          <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gold-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {pending.length > 0 && (
        <div className="px-5 pt-4">
          <h2 className="text-xs font-semibold text-tertiary uppercase tracking-wider pl-4 mb-2">
            Pending
          </h2>
          <div className="bg-white dark:bg-surface-dim rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
            {pending.map((item) => (
              <button
                key={item.evaluateeId}
                onClick={async () => {
                  setNavigatingId(item.evaluateeId)
                  try {
                    const res = await fetch("/api/evaluations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ evaluateeId: item.evaluateeId }),
                    })
                    const data = await res.json()
                    if (data.evaluation?.id) router.push(`/student/evaluations/${data.evaluation.id}`)
                  } catch {
                    setNavigatingId(null)
                  }
                }}
                disabled={navigatingId === item.evaluateeId}
                className="flex items-center justify-between w-full pl-4 pr-4 py-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{item.evaluateeName}</p>
                  {item.evaluateeEmail && (
                    <p className="text-xs text-tertiary mt-0.5">{item.evaluateeEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {navigatingId === item.evaluateeId ? (
                    <svg className="animate-spin ios-spinner w-4 h-4 text-gold-600" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <>
                      <span className="text-[10px] font-semibold text-gold-600 bg-gold-50 dark:bg-gold-900/30 px-2 py-1 rounded-full">
                        Start
                      </span>
                      <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {evaluations.length > 0 && (
        <div className="px-5 pt-6">
          <h2 className="text-xs font-semibold text-tertiary uppercase tracking-wider pl-4 mb-2">
            Completed
          </h2>
          <div className="bg-white dark:bg-surface-dim rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
            {evaluations.map((ev) => (
              <button
                key={ev.id}
                onClick={async () => {
                  setNavigatingId(ev.id)
                  try {
                    const res = await fetch("/api/evaluations", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ evaluateeId: ev.evaluateeId }),
                    })
                    const data = await res.json()
                    if (data.evaluation?.id) router.push(`/student/evaluations/${data.evaluation.id}`)
                  } catch {
                    setNavigatingId(null)
                  }
                }}
                disabled={navigatingId === ev.id}
                className="flex items-center justify-between w-full pl-4 pr-4 py-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{ev.evaluateeName}</p>
                  <p className="text-xs text-tertiary mt-0.5">
                    {ev.status === "SUBMITTED"
                      ? `Submitted · ${new Date(ev.submittedAt!).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                      : `Last saved · ${new Date(ev.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {navigatingId === ev.id ? (
                    <svg className="animate-spin ios-spinner w-4 h-4 text-gold-600" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4 31.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <>
                      {ev.status === "DRAFT" && (
                        <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full shrink-0 ml-3">
                          Continue
                        </span>
                      )}
                      {ev.status === "SUBMITTED" && (
                        <div className="flex items-center gap-1 shrink-0 ml-3">
                          <span className="text-[10px] font-semibold text-green-700 dark:text-green-400">View</span>
                          <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {total === 0 && (
        <p className="text-sm text-tertiary text-center py-20">No evaluations available.</p>
      )}
    </div>
  )
}
