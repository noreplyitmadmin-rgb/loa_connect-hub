"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { usePageTitle } from "@/lib/contexts/page-title"
import { SentimentBadge } from "@/features/evaluations/components/evaluation/SentimentBadge"
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

export default function EvaluationResultsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { setTitle } = usePageTitle()
  const [categories, setCategories] = useState<RubricCategory[]>([])
  const [evaluateeName, setEvaluateeName] = useState("")
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [submittedAt, setSubmittedAt] = useState<string | null>(null)
  const [existingComment, setExistingComment] = useState<string | null>(null)
  const [sentimentLabel, setSentimentLabel] = useState<string | null>(null)
  const [sentimentScore, setSentimentScore] = useState<number | null>(null)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [lockedEndpoint, setLockedEndpoint] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (evaluateeName) {
      setTitle(`Evaluation Result for ${evaluateeName}`)
    }
  }, [evaluateeName, setTitle])

  useEffect(() => {
    const el = document.querySelector("main")
    if (!el) return
    const handleScroll = () => setShowScrollTop(el.scrollTop > 400)
    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const evalRes = await fetch(`/api/evaluations/${params.id}`)
        if (evalRes.status === 403) { setLockedEndpoint(`/api/evaluations/${params.id}`); return }
        if (!evalRes.ok) { router.push("/student/evaluations"); return }
        const evalData = await evalRes.json()
        const ev = evalData.evaluation
        if (!ev) { router.push("/student/evaluations"); return }

        if (ev.status !== "SUBMITTED") {
          router.replace(`/evaluate/${params.id}`)
          return
        }

        setEvaluateeName(ev.evaluateeName || "Unknown")
        setSubmittedAt(ev.submittedAt || null)

        const ratingsRes = await fetch(`/api/evaluations/${ev.id}/ratings`)
        if (ratingsRes.status === 403) { setLockedEndpoint(`/api/evaluations/${ev.id}/ratings`); return }
        const ratingsData = await ratingsRes.json()
        if (ratingsData.ratings?.length > 0) {
          const map: Record<string, number> = {}
          for (const r of ratingsData.ratings) map[r.itemId] = r.rating
          setRatings(map)
        }

        const commentRes = await fetch(`/api/evaluations/${ev.id}/comments`)
        if (commentRes.status === 403) { setLockedEndpoint(`/api/evaluations/${ev.id}/comments`); return }
        const commentData = await commentRes.json()
        if (commentData.comment) {
          setExistingComment(commentData.comment.comment || null)
          setSentimentLabel(commentData.comment.sentimentLabel || null)
          setSentimentScore(commentData.comment.sentimentScore ?? null)
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
        setPageLoading(false)
      } catch {
        setErrorMessage("Failed to load evaluation")
        setPageLoading(false)
      }
    }
    load()
  }, [params.id, router])

  if (lockedEndpoint) {
    return (
      <div className="w-full px-4 sm:px-6 pt-20 sm:pt-22 pb-12">
        <LockedTab endpoint={lockedEndpoint} />
      </div>
    )
  }

  if (pageLoading) {
    return (
      <div className="min-h-dvh bg-surface-muted">
        <div className="pt-20 sm:pt-22 pb-12 animate-pulse">
          <div className="w-full px-4 sm:px-8">
            <div className="mb-8 space-y-2">
              <div className="h-7 w-72 bg-surface-tertiary rounded-full" />
              <div className="h-4 w-48 bg-surface-tertiary rounded-full" />
            </div>
            <div className="space-y-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="bg-surface rounded-2xl overflow-hidden shadow-sm border border-default">
                  <div className="h-1.5 bg-surface-tertiary" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="h-5 bg-surface-tertiary rounded w-1/3" />
                    {[1, 2].map((_) => (
                      <div key={_} className="space-y-2">
                        <div className="h-4 bg-surface-tertiary rounded w-full" />
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((v) => (
                            <div key={v} className="w-10 h-10 bg-surface-tertiary rounded-xl" />
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
      </div>
    )
  }

  const labelMap = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"]
  return (
    <ErrorBoundary>
      <div className="w-full px-4 sm:px-6">
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
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-bold text-primary">Feedback</h3>
                      <SentimentBadge label={sentimentLabel} score={sentimentScore} />
                    </div>
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
