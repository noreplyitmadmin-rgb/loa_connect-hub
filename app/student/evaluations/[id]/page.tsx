"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"

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

export default function FillEvaluationPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [evaluationId, setEvaluationId] = useState<string | null>(null)
  const [evaluateeName, setEvaluateeName] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [pledgeAgreed, setPledgeAgreed] = useState(false)

  useEffect(() => {
    async function init() {
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
        if (evId) {
          setEvaluationId(evId)
          const ratingsRes = await fetch(`/api/evaluations/${evId}/ratings`)
          const ratingsData = await ratingsRes.json()
          if (ratingsData.ratings?.length > 0) {
            const map: Record<string, number> = {}
            for (const r of ratingsData.ratings) {
              map[r.itemId] = r.rating
            }
            setRatings(map)
          }
        }
      } catch {
        alert("Failed to initialize evaluation")
      } finally {
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

  const stepLabel = useMemo(() => {
    if (step < FEEDBACK_STEP && currentCategory) {
      return `${currentCategory.name} (${step + 1} of ${categories.length})`
    }
    if (step === FEEDBACK_STEP) return "Feedback"
    return "Honesty Pledge"
  }, [step, FEEDBACK_STEP, currentCategory, categories.length])

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
      router.push("/student/evaluations")
    } catch {
      alert("Failed to submit evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

  return (
    <div className="pb-8">
      <div className="px-5 pt-8 pb-4">
        <button
          type="button"
          onClick={() => router.push("/student/evaluations")}
          className="text-sm text-gold-600 font-semibold mb-2"
        >
          ← Back
        </button>
        <h1 className="text-[28px] font-bold text-primary tracking-tight">Evaluation</h1>
        <p className="text-sm text-tertiary mt-1">{evaluateeName}</p>
      </div>

      <div className="px-5 pb-6 space-y-2">
        <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gold-500 rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="text-sm text-tertiary text-center font-medium">{stepLabel}</p>
      </div>

      <div className="px-5 space-y-4">
        {currentCategory && (
          <div key={currentCategory.id} className="bg-white dark:bg-surface-dim rounded-2xl p-5 shadow-sm">
            <h3 className="text-base font-bold text-primary mb-4">{currentCategory.name}</h3>
            <div className="space-y-5">
              {currentCategory.items.map((item) => (
                <div key={item.id}>
                  <p className="text-sm text-secondary leading-relaxed mb-3">{item.text}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {["Poor", "Fair", "Good", "Very Good", "Excellent"].map((label, i) => {
                      const v = i + 1
                      return (
                        <button
                          key={v}
                          type="button"
                          onClick={() => handleRatingChange(item.id, v)}
                          className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                            ratings[item.id] === v
                              ? "bg-gold-500 text-white shadow-md scale-105 ring-2 ring-gold-300 ring-offset-2 ring-offset-white dark:ring-offset-surface-dim"
                              : "bg-slate-100 dark:bg-slate-800 text-secondary hover:bg-slate-200 dark:hover:bg-slate-700"
                          }`}
                        >
                          {label === "Very Good" ? "V.Good" : label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3 mt-5 pt-1">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-secondary border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dim active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gold-600 active:bg-gold-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === FEEDBACK_STEP && (
          <div className="bg-white dark:bg-surface-dim rounded-2xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-primary mb-1">Additional Feedback</h2>
            <p className="text-sm text-tertiary mb-4">
              Share your thoughts about this faculty member (optional).
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write your feedback here..."
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm text-primary placeholder:text-tertiary bg-slate-50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-gold-500/20 focus:border-gold-400 min-h-32 resize-none transition-colors"
            />
            <div className="flex items-center gap-3 mt-5 pt-1">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-secondary border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dim active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-gold-600 active:bg-gold-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === SUBMIT_STEP && (
          <div className="bg-white dark:bg-surface-dim rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-center w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-4 mx-auto">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h2 className="text-base font-bold text-primary text-center mb-1">Honesty Pledge</h2>
            <p className="text-sm text-tertiary text-center mb-5">
              Please read and agree before submitting your evaluation.
            </p>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 space-y-3 text-sm text-secondary leading-relaxed">
              <p>
                I hereby affirm that the responses I have provided in this evaluation are my own honest and genuine assessment of the faculty member&apos;s performance.
              </p>
              <p>
                I understand that this evaluation is confidential and will be used to help improve the quality of instruction. I have rated each criterion to the best of my knowledge and belief.
              </p>
              <p>
                I acknowledge that providing false or misleading information may undermine the integrity of the evaluation process.
              </p>
            </div>

            <label className="flex items-center gap-2 mt-5 cursor-pointer">
              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pledgeAgreed}
                  onChange={(e) => setPledgeAgreed(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-[var(--color-brand-600)] transition-colors" />
                <div className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white peer-checked:translate-x-4 transition-transform" />
              </div>
              <span className="text-sm text-secondary leading-relaxed">
                I agree to provide honest and truthful feedback.
              </span>
            </label>

            <div className="flex items-center gap-3 mt-5 pt-1">
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-secondary border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dim active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-secondary border border-slate-200 dark:border-slate-700 bg-white dark:bg-surface-dim disabled:opacity-50 transition-colors"
              >
                Save Draft
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting || !allAnswered || !pledgeAgreed}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 active:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
