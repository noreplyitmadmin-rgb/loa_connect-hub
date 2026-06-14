"use client"

import { useState, useEffect } from "react"
import Skeleton from "@/components/ui/Skeleton"

interface Period {
  id: string
  name?: string
  title?: string
  isActive?: boolean
}

interface EvalItem {
  id: string
  semesterId: string
  evaluateeId: string
  evaluateeName: string
  status: string
  submittedAt: string | null
  createdAt: string
  updatedAt: string
}

export default function StudentEvaluationHistoryPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [evaluations, setEvaluations] = useState<EvalItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.resolve().then(async () => {
      try {
        const [perRes, evalRes] = await Promise.all([
          fetch("/api/evaluation-periods"),
          fetch("/api/evaluations"),
        ])
        const [perData, evalData] = await Promise.all([perRes.json(), evalRes.json()])
        setPeriods(perData.periods || [])
        setEvaluations(evalData.evaluations || [])
      } catch {
        alert("Failed to load history")
      } finally {
        setLoading(false)
      }
    })
  }, [])

  const periodMap = new Map(periods.map((p) => [p.id, p]))
  const submitted = evaluations.filter((e) => e.status === "SUBMITTED")
  const grouped = new Map<string, EvalItem[]>()
  for (const ev of submitted) {
    const key = ev.semesterId
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(ev)
  }

  if (loading) {
    return (
      <div className="pb-12 space-y-6">
        <Skeleton variant="text" className="w-48 h-7" />
        <Skeleton variant="text" className="w-64 h-4" />
        <Skeleton variant="card" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Evaluation History</h1>
        <p className="text-sm text-tertiary mt-1">{submitted.length} evaluation{submitted.length !== 1 ? "s" : ""} submitted</p>
      </div>

      {submitted.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-sm text-tertiary">No submitted evaluations yet.</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([semesterId, evals]) => {
          const period = periodMap.get(semesterId)
          return (
            <div key={semesterId} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                <h3 className="text-sm font-bold text-primary">{period?.name || period?.title || semesterId}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {evals.map((ev) => (
                  <div key={ev.id} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-primary">{ev.evaluateeName}</p>
                      <p className="text-xs text-tertiary mt-0.5">
                        Submitted {ev.submittedAt ? new Date(ev.submittedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
