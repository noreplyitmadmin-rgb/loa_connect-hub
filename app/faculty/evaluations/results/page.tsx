"use client"

import EvaluationDashboard from "@/features/evaluations/components/EvaluationDashboard"

export default function FacultyEvaluationResultsPage() {
  return (
    <EvaluationDashboard
      apiBase="/api/faculty/evaluation-results"
      title="My Evaluation Results"
      subtitle="View your evaluation ratings and feedback"
    />
  )
}
