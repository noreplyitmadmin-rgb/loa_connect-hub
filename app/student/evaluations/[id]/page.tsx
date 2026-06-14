"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useSidebar } from "@/lib/contexts/sidebar"
import { usePageTitle } from "@/lib/contexts/page-title"
import type { SubjectData } from "@/lib/types"
import LockedTab from "@/components/ui/LockedTab"
import ErrorState from "@/components/ui/ErrorState"
import ErrorBoundary from "@/components/ui/ErrorBoundary"

interface RubricItem {
  id: string
  text: string
  displayOrder: number
  weight: number
}

interface RubricCategory {
  id: string
  name: string
  displayOrder: number
  items: RubricItem[]
}

function FacultyHeader({
  evaluateeName,
  subjects,
  onExit,
  isSubmitted,
}: {
  evaluateeName: string
  subjects: SubjectData[]
  onExit: () => void
  isSubmitted?: boolean
}) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-900/90 dark:bg-black/90 backdrop-blur-lg shadow-lg">
      <div className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16">
        {!isSubmitted && evaluateeName && (
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white active:opacity-60 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Exit
          </button>
        )}

        <div className={`min-w-0 flex-1 ${isSubmitted ? "text-center" : "text-right"}`}>
          {!evaluateeName ? (
            <div className="space-y-1.5">
              <div className="h-3.5 w-48 bg-slate-700/60 rounded-full animate-pulse ml-auto" />
              <div className="h-2.5 w-32 bg-slate-700/40 rounded-full animate-pulse ml-auto" />
            </div>
          ) : (
            <>
              <p className="text-sm font-semibold text-white truncate">
                {isSubmitted ? "Evaluated" : "Evaluating"}: <span className="text-brand-400">{evaluateeName}</span>
              </p>
              {subjects.length > 0 && (
                <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                  <span className="text-slate-500">Info:</span> Handles{" "}
                  {subjects.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && <span className="text-slate-500">, </span>}
                      <span className="text-slate-300">{s.code}</span>
                    </span>
                  ))}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default function FillEvaluationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { setExclusive } = useSidebar()
  const { setTitle } = usePageTitle()
  const [categories, setCategories] = useState<RubricCategory[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = sessionStorage.getItem("eval_rubric_cache")
        if (raw) {
          const parsed = JSON.parse(raw)
          if (parsed.categories && Date.now() - parsed.fetchedAt < 300000) return parsed.categories
        }
      } catch { /* ignore */ }
    }
    return []
  })
  const [evaluationId, setEvaluationId] = useState<string | null>(null)
  const [evaluateeName, setEvaluateeName] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState(0)
  const [mobileStepperOpen, setMobileStepperOpen] = useState(false)
  const [pledgeAgreed, setPledgeAgreed] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [existingComment, setExistingComment] = useState<string | null>(null)
  const [subjects] = useState<SubjectData[]>([])
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    return () => setExclusive(false)
  }, [setExclusive])

  useEffect(() => {
    if (evaluateeName && isSubmitted && submittedAt) {
      setTitle(`Evaluation Result for ${evaluateeName} — ${new Date(submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`)
    } else if (evaluateeName) {
      setTitle(evaluateeName)
    }
  }, [evaluateeName, isSubmitted, submittedAt, setTitle])

  useEffect(() => {
    async function load() {
      try {
        const evalRes = await fetch(`/api/evaluations/${params.id}`)
        if (evalRes.status === 403) { setLockedEndpoint(`/api/evaluations/${params.id}`); return }
        if (!evalRes.ok) { router.push("/student/evaluations"); return }
        const evalData = await evalRes.json()
        const ev = evalData.evaluation
        if (!ev) { router.push("/student/evaluations"); return }

        setEvaluateeName(ev.evaluateeName || "Unknown")
        setEvaluationId(ev.id)

        const isSubmitted = ev.status === "SUBMITTED"
        setIsSubmitted(isSubmitted)
        if (isSubmitted) setSubmittedAt(ev.submittedAt || null)
        setExclusive(!isSubmitted)

        const ratingsRes = await fetch(`/api/evaluations/${ev.id}/ratings`)
        if (ratingsRes.status === 403) { setLockedEndpoint(`/api/evaluations/${ev.id}/ratings`); return }
        const ratingsData = await ratingsRes.json()
        if (ratingsData.ratings?.length > 0) {
          const map: Record<string, number> = {}
          for (const r of ratingsData.ratings) map[r.itemId] = r.rating
          setRatings(map)
        }

        if (isSubmitted) {
          const commentRes = await fetch(`/api/evaluations/${ev.id}/comments`)
          if (commentRes.status === 403) { setLockedEndpoint(`/api/evaluations/${ev.id}/comments`); return }
          const commentData = await commentRes.json()
          if (commentData.comment) setExistingComment(commentData.comment.comment || null)
        }

        const periodRes = await fetch("/api/evaluation-periods")
        if (periodRes.status === 403) { setLockedEndpoint("/api/evaluation-periods"); return }
        const periodData = await periodRes.json()
        const activePeriod = (periodData.periods || []).find((p: { isActive: boolean }) => p.isActive)
        if (activePeriod) {
          const rubricRes = await fetch(`/api/evaluation-periods/${activePeriod.id}/rubric`)
          if (rubricRes.status === 403) { setLockedEndpoint(`/api/evaluation-periods/${activePeriod.id}/rubric`); return }
          const rubricData = await rubricRes.json()
          setCategories(rubricData.rubric || [])
        }
      } catch {
        setErrorMessage("Failed to load evaluation")
      }
    }
    load()
  }, [params.id, router, setExclusive])

  useEffect(() => {
    const el = document.querySelector("main")
    if (!el) return
    const handleScroll = () => setShowScrollTop(el.scrollTop > 400)
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  const handleRatingChange = useCallback((itemId: string, value: number) => {
    setRatings((prev) => ({ ...prev, [itemId]: value }))
  }, [])

  const totalItems = useMemo(
    () => categories.reduce((sum, c) => sum + c.items.length, 0),
    [categories],
  )
  const answeredItems = Object.keys(ratings).length
  const allAnswered = answeredItems === totalItems

  const FEEDBACK_STEP = categories.length
  const SUBMIT_STEP = categories.length + 1
  const TOTAL_STEPS = categories.length + 2

  const currentCategory = step < FEEDBACK_STEP ? categories[step] : null
  const currentCategoryAllAnswered = currentCategory
    ? currentCategory.items.every((item) => ratings[item.id] !== undefined)
    : false

  const stepNames = useMemo(() => {
    const names = categories.map((c) => c.name)
    names.push("Feedback", "Submit")
    return names
  }, [categories])

  const isStepCompleted = useCallback(
    (i: number) => {
      if (i < FEEDBACK_STEP) {
        const cat = categories[i]
        return cat ? cat.items.every((item) => ratings[item.id] !== undefined) : false
      }
      if (i === FEEDBACK_STEP) return step > FEEDBACK_STEP
      return isSubmitted
    },
    [categories, ratings, step, FEEDBACK_STEP, isSubmitted],
  )

  async function handleSubmit() {
    if (!evaluationId) return
    setSubmitting(true)
    try {
      const ratingsArray = Object.entries(ratings).map(([itemId, rating]) => ({ itemId, rating }))
      const ratingsRes = await fetch(`/api/evaluations/${evaluationId}/ratings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: ratingsArray }),
      })
      if (ratingsRes.status === 403) { setErrorMessage("Access denied"); setSubmitting(false); return }
      if (comment) {
        const commentRes = await fetch(`/api/evaluations/${evaluationId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        })
        if (commentRes.status === 403) { setErrorMessage("Access denied"); setSubmitting(false); return }
      }
      const submitRes = await fetch(`/api/evaluations/${evaluationId}/submit`, { method: "POST" })
      if (submitRes.status === 403) { setErrorMessage("Access denied"); setSubmitting(false); return }
      router.replace("/student/evaluations/thank-you")
    } catch {
      setErrorMessage("Failed to submit evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  function handleExit() {
    if (!isSubmitted && (step > 0 || comment || Object.keys(ratings).length > 0)) {
      if (!window.confirm("Exit evaluation? Your progress will be lost and you will need to start from the beginning.")) return
    }
   
    router.push("/student/evaluations")
  }

  if (lockedEndpoint) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pt-20 sm:pt-22 pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  // ── Results view (already submitted) ──
  if (isSubmitted) {
    const labelMap = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]
    return (
      <ErrorBoundary>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <Link
          href="/student/evaluations"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700 mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Evaluations
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-primary tracking-tight">
            Evaluation Result for <span className="text-brand-600">{evaluateeName}</span>
          </h1>
          {submittedAt && (
            <p className="text-sm text-tertiary mt-1">
              Submitted {new Date(submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>

        {errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => window.location.reload()} />
        ) : (
          <>
        <div className="space-y-5">
          {categories.map((category) => (
            <div key={category.id} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-default">
              <div className="h-1.5 bg-brand-500" />
              <div className="p-5 sm:p-6">
                <h3 className="text-base font-bold text-primary mb-4">{category.name}</h3>
                <div className="space-y-4">
                  {category.items.map((item) => {
                    const rating = ratings[item.id]
                    return (
                      <div key={item.id}>
                        <p className="text-sm text-secondary leading-relaxed mb-2">{item.text}</p>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <span
                              key={v}
                              className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-xs font-semibold transition-all ${
                                rating === v
                                  ? "bg-brand-500 text-white shadow-sm ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-surface scale-110"
                                  : "bg-surface-tertiary text-tertiary"
                              }`}
                            >
                              {v}
                            </span>
                          ))}
                          {rating && (
                            <span className="text-xs font-semibold text-brand-600 ml-1.5">
                              {labelMap[rating]}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}

          {existingComment && (
            <div className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-default">
              <div className="p-5 sm:p-6">
                <h3 className="text-base font-bold text-primary mb-2">Feedback</h3>
                <p className="text-sm text-secondary leading-relaxed whitespace-pre-wrap">{existingComment}</p>
              </div>
            </div>
          )}
        </div>

        {showScrollTop && (
          <button
            type="button"
            onClick={() => document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-20 sm:bottom-6 right-6 z-[60] w-12 h-12 rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 active:scale-95 transition-all flex items-center justify-center"
            aria-label="Scroll to top"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
        )}
        </>
      )}
      </div>
      </ErrorBoundary>
    )
  }

  // ── Fill mode (draft / new) ──

  const fillContent = errorMessage ? (
    <div className="pt-20 sm:pt-22 pb-12 max-w-5xl mx-auto px-4 sm:px-8">
      <ErrorState message={errorMessage} onRetry={() => window.location.reload()} />
    </div>
  ) : (
    <div className="pt-20 sm:pt-22 pb-12">
        {/* ── Mobile progress indicator (outside flex) ── */}
        <div className="md:hidden mx-auto max-w-5xl px-4 sm:px-8 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileStepperOpen(true)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-tertiary active:bg-surface-tertiary transition-all -ml-1"
                aria-label="Open steps"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="text-xs font-semibold text-brand-600">{stepNames[step]}</span>
            </div>
            <span className="text-xs text-tertiary">{step + 1}/{TOTAL_STEPS}</span>
          </div>
          <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* ── Mobile stepper drawer overlay ── */}
        {mobileStepperOpen && (
          <div className="fixed inset-0 z-[60] md:hidden">
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setMobileStepperOpen(false)}
            />
            <div className="absolute left-0 top-0 bottom-0 w-64 bg-surface shadow-2xl animate-ios-slide-in rounded-r-3xl">
              <div className="flex items-center justify-between px-5 h-14 border-b border-default">
                <span className="text-sm font-bold text-primary">Steps</span>
                <button
                  type="button"
                  onClick={() => setMobileStepperOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-surface-tertiary active:bg-surface-tertiary transition-all"
                >
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="px-5 pt-4 pb-6 space-y-1">
                {stepNames.map((name, i) => {
                  const done = isStepCompleted(i)
                  const isCurrent = i === step
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!done || isCurrent}
                      onClick={() => { setStep(i); setMobileStepperOpen(false) }}
                      className={`flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                        isCurrent
                          ? "bg-brand-50 dark:bg-brand-500/10"
                          : done
                            ? "active:bg-surface-tertiary"
                            : "opacity-50"
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 transition-all ${
                            done
                              ? "bg-green-500 text-white"
                              : isCurrent
                                ? "bg-brand-500 text-white"
                                : "bg-surface-tertiary text-tertiary"
                          }`}
                        >
                          {done ? (
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            i + 1
                          )}
                        </div>
                        {i < stepNames.length - 1 && (
                          <div className={`w-0.5 h-5 ${done ? "bg-green-400" : isCurrent ? "bg-brand-300" : "bg-surface-tertiary"}`} />
                        )}
                      </div>
                      <span
                        className={`text-sm leading-snug ${
                          isCurrent ? "text-brand-600 font-semibold" : done ? "text-primary" : "text-tertiary"
                        }`}
                      >
                        {name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-5xl flex gap-0 px-4 sm:px-8">
          {/* ── Sidebar Stepper (desktop) ── */}
          <div className="hidden md:block w-52 lg:w-60 shrink-0 -ml-4">
            <div className="sticky top-24 pl-4 pr-6 lg:pr-8 border-r border-default min-h-[calc(100dvh-10rem)]">
              <div className="flex flex-col gap-0 pt-1">
                {stepNames.map((name, i) => {
                  const done = isStepCompleted(i)
                  const isCurrent = i === step
                  return (
                    <div key={i} className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={!done || isCurrent}
                        onClick={() => setStep(i)}
                        className="flex items-start gap-3 text-left disabled:cursor-default group"
                      >
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all duration-300 ${
                              done
                                ? "bg-green-500 text-white"
                                : isCurrent
                                  ? "bg-brand-500 text-white"
                                  : "bg-surface-tertiary text-tertiary"
                            } ${isCurrent ? "ring-4 ring-brand-500/20" : ""} ${done && !isCurrent ? "group-hover:opacity-80" : ""}`}
                          >
                            {done ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              i + 1
                            )}
                          </div>
                          {i < stepNames.length - 1 && (
                            <div className={`w-0.5 h-6 ${done ? "bg-green-400" : isCurrent ? "bg-brand-300" : "bg-surface-tertiary"}`} />
                          )}
                        </div>
                        <span
                          className={`pt-1.5 text-sm leading-snug transition-colors duration-200 ${
                            isCurrent ? "text-brand-600 font-semibold" : done ? "text-green-700 dark:text-green-400 hover:text-green-600 cursor-pointer" : "text-tertiary"
                          }`}
                        >
                          {name}
                        </span>
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Content ── */}
          <div className="flex-1 min-w-0 space-y-5 md:pl-8 lg:pl-12">
          {/* ── Category step ── */}
          <div className={`bg-surface rounded-2xl overflow-hidden shadow-sm border border-default ${currentCategory ? '' : 'hidden'}`}>
            <div className="h-1.5 bg-brand-500" />
            <div className="p-5 sm:p-7">
              <div key={step} className="animate-ios-slide-in">
                {currentCategory && (
                  <>
                    <div className="flex items-start justify-between mb-6">
                      <h3 className="text-lg font-bold text-primary tracking-tight">{currentCategory.name}</h3>
                      {currentCategoryAllAnswered && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1.5 rounded-full shrink-0 ml-3 ring-1 ring-green-500/30">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Complete
                        </span>
                      )}
                    </div>
                    <div className="space-y-7">
                      {currentCategory.items.map((item) => (
                        <div key={item.id}>
                          <div className="flex items-start gap-2 mb-3">
                            <span className={`mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center transition-all duration-200 ${
                              ratings[item.id] !== undefined
                                ? "bg-green-500 text-white scale-100"
                                : "bg-surface-tertiary scale-0"
                            }`}>
                              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </span>
                            <p className={`text-sm leading-relaxed transition-colors duration-200 ${
                              ratings[item.id] !== undefined ? "text-primary font-medium" : "text-secondary"
                            }`}>{item.text}</p>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                              {["Poor", "Fair", "Good", "Very Good", "Excellent"].map((label, i) => {
                                const v = i + 1
                                const isSelected = ratings[item.id] === v
                                return (
                                  <button
                                    key={v}
                                    type="button"
                                    onClick={() => handleRatingChange(item.id, v)}
                                    className={`h-12 sm:h-14 rounded-2xl font-semibold transition-all duration-200 active:scale-95 ${
                                      isSelected
                                        ? "bg-brand-500 text-white shadow-md scale-105 ring-2 ring-brand-500 ring-offset-2 ring-offset-white dark:ring-offset-surface sm:ring-offset-4"
                                        : "bg-surface-tertiary text-tertiary hover:bg-surface-hover"
                                    }`}
                                  >
                                    <span className="sm:hidden" title={label}>{v}</span>
                                    <span className="hidden sm:inline text-xs sm:text-sm">{label}</span>
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center justify-between px-1 sm:hidden pt-3 pb-1 border-t border-default/50 mt-4">
                        {["Poor", "Fair", "Good", "Very Good", "Excellent"].map((lbl, i) => (
                          <span key={lbl} className="text-[10px] text-tertiary/50 text-center leading-tight" style={{ maxWidth: '18%' }}>
                            {i + 1}<br /><span className="text-tertiary/40">{lbl}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 mt-8 pt-4 border-t border-default">
                {step > 0 && (
                  <button
                    type="button"
                    onClick={() => setStep((s) => s - 1)}
                    className="btn-ios-gray flex-1"
                  >
                    Previous
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!currentCategoryAllAnswered}
                  className="btn-ios-primary flex-1 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {/* ── Feedback step ── */}
          <div className={`bg-surface rounded-2xl overflow-hidden shadow-sm border border-default ${step === FEEDBACK_STEP ? '' : 'hidden'}`}>
            <div className="h-1.5 bg-brand-500" />
            <div className="p-5 sm:p-7">
              <div key={step} className="animate-ios-slide-in">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-9 h-9 rounded-full bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
                    <svg className="w-4.5 h-4.5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-primary tracking-tight">Additional Feedback</h2>
                    <p className="text-xs text-tertiary">Share your thoughts (optional)</p>
                  </div>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Write your feedback here..."
                  className="w-full border border-default rounded-2xl px-4 py-3.5 text-sm text-primary placeholder:text-tertiary bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 min-h-36 resize-none transition-all duration-200 mt-5"
                />
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-default">
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-ios-gray flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  className="btn-ios-primary flex-1"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>

          {/* ── Submit step ── */}
          <div className={`bg-surface rounded-2xl overflow-hidden shadow-sm border border-default ${step === SUBMIT_STEP ? '' : 'hidden'}`}>
            <div className="h-1.5 bg-brand-500" />
            <div className="p-5 sm:p-7">
              <div key={step} className="animate-ios-slide-in">
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-14 h-14 bg-brand-50 dark:bg-brand-500/10 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-7 h-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-primary tracking-tight">Honesty Pledge</h2>
                  <p className="text-sm text-tertiary mt-1 max-w-xs">Please read and agree before submitting your evaluation.</p>
                </div>

                <div className="bg-surface-secondary rounded-2xl p-5 space-y-3 text-sm text-secondary leading-relaxed">
                  <p>I hereby affirm that the responses I have provided in this evaluation are my own honest and genuine assessment of the faculty member&apos;s performance.</p>
                  <p>I understand that this evaluation is confidential and will be used to help improve the quality of instruction. I have rated each criterion to the best of my knowledge and belief.</p>
                  <p>I acknowledge that providing false or misleading information may undermine the integrity of the evaluation process.</p>
                </div>

                <label className="flex items-center gap-3 mt-6 cursor-pointer group">
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pledgeAgreed}
                      onChange={(e) => setPledgeAgreed(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-7 rounded-full bg-surface-tertiary peer-checked:bg-brand-500 transition-colors" />
                    <div className="absolute left-1 top-1 w-5 h-5 rounded-full bg-white shadow-sm peer-checked:translate-x-4 transition-transform" />
                  </div>
                  <span className="text-sm text-secondary group-active:text-primary transition-colors">
                    I agree to provide honest and truthful feedback.
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-default">
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="btn-ios-gray flex-1"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || !allAnswered || !pledgeAgreed}
                  className="btn-ios-primary flex-1"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    )

  return (
    <ErrorBoundary>
    <div className="min-h-dvh bg-surface-muted">
      <FacultyHeader evaluateeName={evaluateeName} subjects={subjects} onExit={handleExit} isSubmitted={isSubmitted} />
      {fillContent}
    </div>
    </ErrorBoundary>
  )
}
