"use client"

import EvaluationDashboard from "@/features/evaluations/components/EvaluationDashboard"

export default function AdminEvalResultsReports() {
  return (
    <EvaluationDashboard
      apiBase="/api/admin/evaluation-results"
      showDepartmentFilter
      title="Evaluation Results"
      subtitle="View faculty evaluation results across departments"
    />
  )
}
