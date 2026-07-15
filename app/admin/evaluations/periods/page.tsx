import { EvaluationPeriodsTab } from "@/features/admin-data/components/EvaluationPeriodsTab"
export default function AdminEvaluationPeriods() {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-lg font-bold text-primary">Evaluation Periods</h1>
        <p className="text-xs text-tertiary mt-1">Manage evaluation periods and assign rubrics for each period.</p>
      </div>
      <EvaluationPeriodsTab />
    </div>
  )
}
