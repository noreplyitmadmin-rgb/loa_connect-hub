"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Skeleton from "@/components/ui/Skeleton"
import { SkeletonCard } from "@/components/ui/Skeleton"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

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
  const [outOfRange, setOutOfRange] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const evalTabRef = useRef<Window | null>(null)
  const evalTabIdRef = useRef<string | null>(null)

  function openEvalTab(id: string) {
    if (evalTabRef.current && !evalTabRef.current.closed) {
      if (evalTabIdRef.current === id) {
        evalTabRef.current.focus()
        return
      }
      evalTabRef.current.close()
    }
    evalTabRef.current = window.open(`/evaluate/${id}`, "_blank")
    evalTabIdRef.current = id
  }

  useEffect(() => {
    async function loadData() {
      try {
        const periodRes = await fetch("/api/evaluation-periods")
        if (periodRes.status === 403) { setLockedEndpoint("/api/evaluation-periods"); return }
        const periodData = await periodRes.json()
        const active = (periodData.periods || []).find((p: { isActive: boolean }) => p.isActive)
        if (active?.evalStartDate && active?.evalEndDate) {
          const now = Date.now()
          const start = new Date(active.evalStartDate).getTime()
          const end = new Date(active.evalEndDate).getTime() + 86_399_999
          if (now < start || now > end) {
            setOutOfRange(true)
          }
        } else {
          setOutOfRange(true)
        }

        if (active) {
          fetch(`/api/evaluation-periods/${active.id}/rubric`)
            .then((r) => {
              if (r.status === 403) { setErrorMessage("Access denied to rubric endpoint"); return null }
              return r.json()
            })
            .then((rubricData) => {
              if (rubricData?.rubric) {
                sessionStorage.setItem("eval_rubric_cache", JSON.stringify({ categories: rubricData.rubric, fetchedAt: Date.now() }))
              }
            })
            .catch(() => {})
        }

        const [pendingRes, evalRes] = await Promise.all([
          fetch("/api/evaluations/pending"),
          fetch("/api/evaluations"),
        ])
        if (pendingRes.status === 403) { setLockedEndpoint("/api/evaluations/pending"); return }
        if (evalRes.status === 403) { setLockedEndpoint("/api/evaluations"); return }
        const [pendingData, evalData] = await Promise.all([pendingRes.json(), evalRes.json()])
        setPending(pendingData.pending || [])
        setEvaluations(evalData.evaluations || [])
      } catch {
        setErrorMessage("Failed to load evaluations")
      } finally {
        setLoading(false)
      }
    }
    Promise.resolve().then(loadData)

    try {
      const ch = new BroadcastChannel("eval-updates")
      ch.onmessage = () => loadData()
      return () => ch.close()
    } catch {}
  }, [])

  const total = pending.length + evaluations.length
  const completed = evaluations.length

  if (lockedEndpoint) {
    return (
      <div className="pb-12 px-5 pt-8">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

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
    <ErrorBoundary>
    <div className="w-full px-4 sm:px-6 space-y-6 sm:space-y-8 pb-12">
      <div className="animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-primary tracking-tight">
              Faculty Evaluations
              <span className="inline-block ml-2">📝</span>
            </h1>
            <p className="text-sm text-tertiary mt-1">
              {completed} of {total} completed
            </p>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <ErrorState message={errorMessage} onRetry={() => window.location.reload()} />
      ) : (
        <>
        {outOfRange && (
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="card p-5 sm:p-6 bg-surface border-l-4 border-l-amber-400">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl shrink-0">
                🔒
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Evaluation period is not open</p>
                <p className="text-xs text-tertiary mt-1">
                  The evaluation period has not started yet or has already closed. You&apos;ll be able to submit your evaluations once the window opens.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!outOfRange && total > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {[
              { label: "Pending", value: pending.length, color: "from-amber-500 to-orange-500", bg: "bg-amber-50 border-amber-200", icon: "⏳" },
              { label: "Submitted", value: evaluations.filter((e) => e.status === "SUBMITTED").length, color: "from-emerald-500 to-teal-500", bg: "bg-emerald-50 border-emerald-200", icon: "✅" },
              { label: "Drafts", value: evaluations.filter((e) => e.status === "DRAFT").length, color: "from-blue-500 to-blue-600", bg: "bg-blue-50 border-blue-200", icon: "📄" },
            ].map((s, i) => (
              <div
                key={s.label}
                className="card p-4 bg-surface flex items-center gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                style={{ animationDelay: `${0.12 + i * 0.04}s` }}
              >
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center text-lg shrink-0`}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-primary leading-none">{s.value}</p>
                  <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mt-1">{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!outOfRange && total > 1 && (
        <div className="animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-gold-400 to-emerald-500 transition-all duration-1000 ease-out"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {!outOfRange && pending.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <span>⏳</span> Pending Evaluations
          </h2>
          <div className="space-y-2">
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
                      if (res.status === 403) { setErrorMessage("Access denied"); setNavigatingId(null); return }
                      const data = await res.json()
                      if (data.evaluation?.id) { openEvalTab(data.evaluation.id); setNavigatingId(null) }
                  } catch {
                    setNavigatingId(null)
                  }
                }}
                disabled={navigatingId === item.evaluateeId}
                className="card w-full p-4 bg-surface flex items-center justify-between hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] transition-all duration-200 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-primary">{item.evaluateeName}</p>
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
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold-600 bg-gold-50 dark:bg-gold-900/30 px-3 py-1.5 rounded-full">
                      Start
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!outOfRange && evaluations.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "0.25s" }}>
          <h2 className="text-sm font-bold text-primary mb-3 flex items-center gap-2">
            <span>📋</span> Submitted & Drafts
          </h2>
          <div className="space-y-2">
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
                      if (res.status === 403) { setErrorMessage("Access denied"); setNavigatingId(null); return }
                      const data = await res.json()
                    if (data.evaluation?.id) {
                      if (ev.status === "SUBMITTED") {
                        router.push(`/student/evaluations/${data.evaluation.id}`)
                      } else {
                        openEvalTab(data.evaluation.id); setNavigatingId(null)
                      }
                    }
                  } catch {
                    setNavigatingId(null)
                  }
                }}
                disabled={navigatingId === ev.id}
                className={`card w-full p-4 bg-surface flex items-center justify-between transition-all duration-200 text-left ${
                  ev.status === "SUBMITTED" ? "opacity-80" : "hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-primary">{ev.evaluateeName}</p>
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
                  ) : ev.status === "DRAFT" ? (
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full">
                      Continue
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full">
                      View
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {!outOfRange && total === 0 && (
        <div className="card p-12 sm:p-16 bg-surface text-center animate-fade-in" style={{ animationDelay: "0.15s" }}>
          <div className="w-16 h-16 bg-gold-50 border border-gold-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl">📝</span>
          </div>
          <h2 className="text-lg font-bold text-primary mb-2">No evaluations yet</h2>
          <p className="text-sm text-tertiary max-w-md mx-auto">
            You don&apos;t have any faculty evaluations to complete right now. Check back when the evaluation period opens.
          </p>
        </div>
      )}
        </>
      )}
    </div>
    </ErrorBoundary>
  )
}
