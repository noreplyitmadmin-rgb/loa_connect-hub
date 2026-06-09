"use client"

import { useState, useEffect } from "react"
import { FacultyResultCard } from "@/features/evaluations/components/evaluation/FacultyResultCard"

interface Result {
  id: string
  periodId: string
  facultyId: string
  totalRespondents: number
  professionalManner: number | null
  communicationWithStudent: number | null
  studentEngagement: number | null
  learningMaterials: number | null
  timeManagement: number | null
  experientialLearning: number | null
  respectUniqueness: number | null
  assessmentAndFeedback: number | null
  generalRating: number | null
  remarks: string | null
}

interface Period {
  id: string
  name: string
}

export default function FacultyEvaluationResultsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch("/api/evaluation-periods")
      .then((r) => r.json())
      .then((data) => {
        setPeriods(data.periods || [])
        if (data.periods?.length > 0) setSelectedPeriod(data.periods[0].id)
      })
      .catch(() => alert("Failed to load periods"))
  }, [])

  useEffect(() => {
    if (!selectedPeriod) return
    fetch(`/api/faculty/evaluation-results?periodId=${selectedPeriod}`)
      .then((r) => {
        if (!r.ok) return null
        return r.json()
      })
      .then((data) => { setResult(data?.result || null); setLoading(false) })
      .catch(() => { alert("Failed to load result"); setLoading(false) })
  }, [selectedPeriod])

  const categories = result
    ? [
        { label: "Professional Manner", score: result.professionalManner },
        { label: "Communication with Students", score: result.communicationWithStudent },
        { label: "Student Engagement", score: result.studentEngagement },
        { label: "Learning Materials", score: result.learningMaterials },
        { label: "Time Management", score: result.timeManagement },
        { label: "Experiential Learning", score: result.experientialLearning },
        { label: "Respect for Uniqueness", score: result.respectUniqueness },
        { label: "Assessment and Feedback", score: result.assessmentAndFeedback },
      ].filter((c) => c.score !== null)
    : []

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">My Evaluation Results</h1>
        <p className="text-sm text-tertiary mt-1">View your evaluation ratings and feedback</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-tertiary uppercase tracking-wider font-semibold">Period</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-primary min-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-tertiary text-center py-12">Loading...</p>
      ) : !result ? (
        <p className="text-sm text-tertiary text-center py-12">No results available yet.</p>
      ) : (
        <FacultyResultCard
          facultyName="My Results"
          totalRespondents={result.totalRespondents}
          generalRating={result.generalRating}
          remarks={result.remarks}
          categories={categories}
        />
      )}
    </div>
  )
}
