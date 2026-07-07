"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Skeleton from "@/components/ui/Skeleton"

interface Period {
  id: string
  title?: string
  name?: string
}

export default function DeanEvaluationResultsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const semesterId = searchParams.get("semesterId")

  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [deptId, setDeptId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch("/api/evaluation-periods").then((r) => r.json()),
      fetch("/api/dean/evaluation-results/department").then((r) => r.json()),
    ])
      .then(([periodData, deptData]) => {
        const list: Period[] = periodData.periods ?? periodData ?? []
        setPeriods(list)
        setDeptId(deptData.departmentId ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!semesterId || !deptId) return
    Promise.resolve().then(() => {
      router.replace(`/dean/evaluations/results/${deptId}?semesterId=${encodeURIComponent(semesterId)}`)
    })
  }, [semesterId, deptId, router])

  const handleSelect = (id: string) => {
    if (deptId) {
      router.replace(`/dean/evaluations/results/${deptId}?semesterId=${encodeURIComponent(id)}`)
    }
  }

  if (loading) {
    return (
      <div className="w-full space-y-4 pb-12">
        <Skeleton variant="text" />
        <Skeleton variant="table-row" />
      </div>
    )
  }

  if (!deptId) {
    return (
      <div className="w-full space-y-6 pb-12">
        <h1 className="text-2xl font-bold text-primary">Evaluation Results</h1>
        <p className="text-sm text-red-600">No department association found for your account.</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-12">
      <h1 className="text-2xl font-bold text-primary">Evaluation Results</h1>
      <p className="text-xs text-tertiary">Select a period to view your department&apos;s evaluation results.</p>

      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-secondary">Period</label>
        <select
          value={semesterId ?? ""}
          onChange={(e) => handleSelect(e.target.value)}
          className="input text-xs px-3 py-2 rounded-lg border border-strong bg-surface"
        >
          <option value="">Select a period...</option>
          {periods.map((p) => (
            <option key={p.id} value={p.id}>{p.title || p.name || p.id}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
