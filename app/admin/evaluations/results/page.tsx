"use client"

import EvaluationDashboard from "@/features/evaluations/components/EvaluationDashboard"

export default function AdminEvaluationResultsPage() {
  return (
    <EvaluationDashboard
      apiBase="/api/admin/evaluation-results"
      showDepartmentFilter
      showVisibilityToggles
      showUnenrolledToggle
      perSubject
      title="Evaluation Results"
      subtitle="View faculty evaluation results across departments"
    />
  )
}
