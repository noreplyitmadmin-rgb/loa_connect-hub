"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { EvaluationForm } from "@/components/evaluation/EvaluationForm"

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
  const [ratings, setRatings] = useState<Record<string, number>>({})
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      try {
        const periodRes = await fetch("/api/evaluation-periods")
        const periodData = await periodRes.json()
        const activePeriod = (periodData.periods || []).find((p: { isActive: boolean }) => p.isActive)
        if (!activePeriod) {
          alert("No active evaluation period")
          router.push("/student/evaluation")
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
      router.push("/student/evaluation")
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
      router.push("/student/evaluation")
    } catch {
      alert("Failed to submit evaluation")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-tertiary text-center py-12">Loading...</p>

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Faculty Evaluation</h1>
        <p className="text-sm text-tertiary mt-1">
          Evaluate faculty member #{params.id}
        </p>
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-tertiary text-center py-12">
          No rubric configured for the current evaluation period.
        </p>
      ) : (
        <EvaluationForm
          categories={categories}
          ratings={ratings}
          onRatingChange={handleRatingChange}
          comment={comment}
          onCommentChange={setComment}
          onSubmit={handleSubmit}
          onSaveDraft={handleSaveDraft}
          submitting={submitting}
        />
      )}
    </div>
  )
}
