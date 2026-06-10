"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSidebar } from "@/lib/contexts/sidebar"

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

interface SubjectData {
  id: string
  code: string
  title: string
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
        {!isSubmitted && (
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
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [evaluationId, setEvaluationId] = useState<string | null>(null)
  const [evaluateeName, setEvaluateeName] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [pledgeAgreed, setPledgeAgreed] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [existingComment, setExistingComment] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<SubjectData[]>([])

  useEffect(() => {
    return () => setExclusive(false)
  }, [setExclusive])

  const fullscreenRef = useRef(false)

  useEffect(() => {
    if (loading || isSubmitted) return

    function enterFullscreen() {
      if (document.fullscreenElement) return
      fullscreenRef.current = true
      document.documentElement.requestFullscreen?.().catch(() => {})
    }
    enterFullscreen()
    document.addEventListener("click", enterFullscreen, { once: true })
    return () => document.removeEventListener("click", enterFullscreen)
  }, [loading, isSubmitted])

  useEffect(() => {
    if (loading || isSubmitted) return

    function onFSChange() {
      if (!document.fullscreenElement && fullscreenRef.current) {
        document.documentElement.requestFullscreen?.().catch(() => {})
      }
    }
    document.addEventListener("fullscreenchange", onFSChange)
    return () => document.removeEventListener("fullscreenchange", onFSChange)
  }, [loading, isSubmitted])

  useEffect(() => {
    async function init() {
      let submitted = false
      try {
        const periodRes = await fetch("/api/evaluation-periods")
        const periodData = await periodRes.json()
        const activePeriod = (periodData.periods || []).find((p: { isActive: boolean }) => p.isActive)
        if (!activePeriod) {
          alert("No active evaluation period")
          router.push("/student/evaluations")
          return
        }

        const rubricRes = await fetch(`/api/evaluation-periods/${activePeriod.id}/rubric`)
        const rubricData = await rubricRes.json()
        setCategories(rubricData.rubric || [])

        const evalRes = await fetch("/api/evaluations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ evaluateeId: params.id }),
        })
        const evalData = await evalRes.json()
        setEvaluateeName(evalData.evaluation?.evaluateeName || "Unknown")
        const evId = evalData.evaluation?.id
        const evStatus = evalData.evaluation?.status

        if (evId) {
          setEvaluationId(evId)

          if (evStatus === "SUBMITTED") {
            submitted = true
            setIsSubmitted(true)
            setSubmittedAt(evalData.evaluation?.submittedAt || null)
          }

          const ratingsRes = await fetch(`/api/evaluations/${evId}/ratings`)
          const ratingsData = await ratingsRes.json()
          if (ratingsData.ratings?.length > 0) {
            const map: Record<string, number> = {}
            for (const r of ratingsData.ratings) {
              map[r.itemId] = r.rating
            }
            setRatings(map)
          }

          if (evStatus === "SUBMITTED") {
            const commentRes = await fetch(`/api/evaluations/${evId}/comments`)
            const commentData = await commentRes.json()
            if (commentData.comment) {
              setExistingComment(commentData.comment.comment || null)
            }
          }
        }

        const subjRes = await fetch(`/api/evaluations/faculty-subjects?facultyId=${params.id}&semesterId=${activePeriod.id}`)
        const subjData = await subjRes.json()
        if (subjData.subjects) setSubjects(subjData.subjects)
      } catch {
        alert("Failed to initialize evaluation")
      } finally {
        if (!submitted) setExclusive(true)
        setLoading(false)
      }
    }
    init()
  }, [params.id, router])

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

  async function handleSaveDraft() {
    if (!evaluationId) return
    try {
      const ratingsArray = Object.entries(ratings).map(([itemId, rating]) => ({ itemId, rating }))
      await fetch(`/api/evaluations/${evaluationId}/ratings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: ratingsArray }),
      })
      if (comment) {
        await fetch(`/api/evaluations/${evaluationId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        })
      }
      router.push("/student/evaluations")
    } catch {
      alert("Failed to save draft")
    }
  }

  async function handleSubmit() {
    if (!evaluationId) return
    setSubmitting(true)
    try {
      const ratingsArray = Object.entries(ratings).map(([itemId, rating]) => ({ itemId, rating }))
      await fetch(`/api/evaluations/${evaluationId}/ratings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ratings: ratingsArray }),
      })
      if (comment) {
        await fetch(`/api/evaluations/${evaluationId}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ comment }),
        })
      }
      await fetch(`/api/evaluations/${evaluationId}/submit`, { method: "POST" })
      router.replace("/student/evaluations")
    } catch {
      alert("Failed to submit evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  function handleExit() {
    if (!isSubmitted && (step > 0 || comment || Object.keys(ratings).length > 0)) {
      if (!window.confirm("Exit evaluation? Your progress will be lost and you will need to start from the beginning.")) return
    }
    fullscreenRef.current = false
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {})
    router.push("/student/evaluations")
  }

  if (loading) {
    return (
      <div className="min-h-dvh bg-surface-muted">
        <FacultyHeader evaluateeName={evaluateeName} subjects={subjects} onExit={handleExit} isSubmitted={isSubmitted} />
        <div className="pt-20 sm:pt-22 pb-12 px-4 sm:px-8 md:px-12 lg:px-16 animate-pulse">
          <div className="mb-8 h-2.5 bg-surface-tertiary rounded-full" />
          <div className="space-y-5">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-default">
                <div className="h-1.5 bg-surface-tertiary" />
                <div className="p-5 sm:p-7 space-y-4">
                  <div className="h-5 bg-surface-tertiary rounded w-1/3" />
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-3 pt-2">
                      <div className="h-4 bg-surface-tertiary rounded w-full" />
                      <div className="h-4 bg-surface-tertiary rounded w-3/4" />
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((j) => (
                          <div key={j} className="h-12 sm:h-14 bg-surface-tertiary rounded-2xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Results view (already submitted) ──
  if (isSubmitted) {
    const labelMap = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]
    return (
      <div className="min-h-dvh bg-surface-muted">
        <FacultyHeader evaluateeName={evaluateeName} subjects={subjects} onExit={handleExit} isSubmitted={isSubmitted} />
        <div className="pt-20 sm:pt-22 pb-12 px-4 sm:px-8 md:px-12 lg:px-16">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary tracking-tight">Evaluation Results</h1>
            {submittedAt && (
              <p className="text-sm text-tertiary mt-1">
                Submitted {new Date(submittedAt).toLocaleDateString()}
              </p>
            )}
          </div>

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
        </div>
      </div>
    )
  }

  // ── Fill mode (draft / new) ──
  return (
    <div className="min-h-dvh bg-surface-muted">
      <FacultyHeader evaluateeName={evaluateeName} subjects={subjects} onExit={handleExit} isSubmitted={isSubmitted} />

      <div className="pt-20 sm:pt-22 pb-12">
        <div className="flex gap-0 px-4 sm:px-8 md:px-12 lg:px-16">
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

          {/* ── Mobile progress indicator ── */}
          <div className="md:hidden w-full mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-brand-600">{stepNames[step]}</span>
              <span className="text-xs text-tertiary">{step + 1}/{TOTAL_STEPS}</span>
            </div>
            <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <div className="flex items-center gap-0 overflow-x-auto -mx-4 px-4 pb-1 scrollbar-none">
              {stepNames.map((name, i) => {
                const done = isStepCompleted(i)
                const isCurrent = i === step
                return (
                  <div key={i} className="flex items-center gap-0 shrink-0">
                    <button
                      type="button"
                      disabled={!done || isCurrent}
                      onClick={() => setStep(i)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all shrink-0 ${
                        done
                          ? "bg-green-500 text-white"
                          : isCurrent
                            ? "bg-brand-500 text-white"
                            : "bg-surface-tertiary text-tertiary"
                      } ${isCurrent ? "ring-2 ring-brand-500/20" : ""} ${done && !isCurrent ? "active:opacity-70" : ""}`}
                    >
                      {done ? (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </button>
                    {i < stepNames.length - 1 && (
                      <div className={`h-0.5 w-5 shrink-0 mx-0.5 ${done ? "bg-green-400" : isCurrent ? "bg-brand-300" : "bg-surface-tertiary"}`} />
                    )}
                  </div>
                )
              })}
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
                          <div className="grid grid-cols-5 gap-2">
                            {["Poor", "Fair", "Good", "Very Good", "Excellent"].map((label, i) => {
                              const v = i + 1
                              const isSelected = ratings[item.id] === v
                              return (
                                <button
                                  key={v}
                                  type="button"
                                  onClick={() => handleRatingChange(item.id, v)}
                                  className={`h-12 sm:h-14 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-200 active:scale-95 ${
                                    isSelected
                                      ? "bg-brand-500 text-white shadow-md scale-105 ring-2 ring-brand-500 ring-offset-4 ring-offset-white dark:ring-offset-surface"
                                      : "bg-surface-tertiary text-tertiary hover:bg-surface-hover"
                                  }`}
                                >
                                  {label}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
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
                  onClick={handleSaveDraft}
                  disabled={submitting}
                  className="btn-ios-gray flex-1"
                >
                  Save Draft
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
  </div>
  )
}
