"use client"

import { useState, useEffect } from "react"
import Link from "next/link"

interface ExistingEvaluation {
  id: string
  evaluateeId: string
  status: string
  submittedAt: string | null
}

export default function StudentEvaluationsPage() {
  const [pending, setPending] = useState<string[]>([])
  const [evaluations, setEvaluations] = useState<ExistingEvaluation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/evaluations/pending").then((r) => r.json()),
      fetch("/api/evaluations").then((r) => r.json()),
    ])
      .then(([pendingData, evalData]) => {
        setPending(pendingData.pending || [])
        setEvaluations(evalData.evaluations || [])
      })
      .catch(() => alert("Failed to load evaluations"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Faculty Evaluations</h1>
        <p className="text-sm text-tertiary mt-1">Evaluate your faculty members</p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-primary">Pending Evaluations</h2>
          {pending.map((evaluateeId) => (
            <Link
              key={evaluateeId}
              href={`/student/evaluations/${evaluateeId}`}
              className="block bg-white rounded-xl border border-slate-200 p-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">{evaluateeId}</span>
                <span className="text-xs text-blue-600 font-medium">Start Evaluation →</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {evaluations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-primary">Completed Evaluations</h2>
          {evaluations.map((ev) => (
            <div key={ev.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-semibold text-primary">{ev.evaluateeId}</span>
                  <p className="text-xs text-tertiary mt-0.5">
                    {ev.status === "SUBMITTED" ? "Submitted" : "Draft"} {ev.submittedAt ? `· ${new Date(ev.submittedAt).toLocaleDateString()}` : ""}
                  </p>
                </div>
                {ev.status === "DRAFT" && (
                  <Link
                    href={`/student/evaluations/${ev.evaluateeId}`}
                    className="text-xs text-blue-600 font-medium"
                  >
                    Continue →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pending.length === 0 && evaluations.length === 0 && (
        <p className="text-sm text-tertiary text-center py-12">No evaluations available.</p>
      )}
    </div>
  )
}
