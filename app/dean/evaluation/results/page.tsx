"use client"

import { useState, useEffect } from "react"
import { FacultyResultCard } from "@/components/evaluation/FacultyResultCard"

interface Result {
  id: string
  periodId: string
  facultyId: string
  departmentId: string | null
  totalRespondents: number
  generalRating: number | null
  remarks: string | null
}

interface Period {
  id: string
  name: string
}

export default function DeanEvaluationResultsPage() {
  const [periods, setPeriods] = useState<Period[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState("")
  const [results, setResults] = useState<Result[]>([])
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
    setLoading(true)
    fetch(`/api/dean/evaluation-results?periodId=${selectedPeriod}`)
      .then((r) => r.json())
      .then((data) => setResults(data.results || []))
      .catch(() => alert("Failed to load results"))
      .finally(() => setLoading(false))
  }, [selectedPeriod])

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-primary">Department Evaluation Results</h1>
        <p className="text-sm text-tertiary mt-1">View evaluation results for your department</p>
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
      ) : results.length === 0 ? (
        <p className="text-sm text-tertiary text-center py-12">No results available.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((r) => (
            <FacultyResultCard
              key={r.id}
              facultyName={r.facultyId}
              totalRespondents={r.totalRespondents}
              generalRating={r.generalRating}
              remarks={r.remarks}
              categories={[]}
            />
          ))}
        </div>
      )}
    </div>
  )
}
