"use client"

import EvaluationDashboard from "@/features/evaluations/components/EvaluationDashboard"

export default function DeanEvalResultsReports() {
  return (
    <EvaluationDashboard
      apiBase="/api/dean/evaluation-results"
      title="Evaluation Results"
      subtitle="Department results overview"
    />
  )
}
