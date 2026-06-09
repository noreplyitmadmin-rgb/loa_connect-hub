"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

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
}

export default function StudentEvaluationsPage() {
  const [pending, setPending] = useState<PendingItem[]>([])
  const [evaluations, setEvaluations] = useState<ExistingEvaluation[]>([])
  const [loading, setLoading] = useState(true)

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
      } catch {
        alert("Failed to load evaluations")
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const total = pending.length + evaluations.length
  const completed = evaluations.length

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

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
              <Link
                key={item.evaluateeId}
                href={`/student/evaluations/${item.evaluateeId}`}
                className="flex items-center justify-between pl-4 pr-4 py-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{item.evaluateeName}</p>
                  {item.evaluateeEmail && (
                    <p className="text-xs text-tertiary mt-0.5">{item.evaluateeEmail}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] font-semibold text-gold-600 bg-gold-50 dark:bg-gold-900/30 px-2 py-1 rounded-full">
                    Start
                  </span>
                  <svg className="w-4 h-4 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
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
              <div
                key={ev.id}
                className="flex items-center justify-between pl-4 pr-4 py-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-primary">{ev.evaluateeName}</p>
                  <p className="text-xs text-tertiary mt-0.5">
                    {ev.status === "SUBMITTED" ? "Submitted" : "Draft"}
                    {ev.submittedAt ? ` · ${new Date(ev.submittedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {ev.status === "DRAFT" && (
                  <Link
                    href={`/student/evaluations/${ev.evaluateeId}`}
                    className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full shrink-0 ml-3"
                  >
                    Continue
                  </Link>
                )}
                {ev.status === "SUBMITTED" && (
                  <svg className="w-5 h-5 text-green-500 shrink-0 ml-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
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
