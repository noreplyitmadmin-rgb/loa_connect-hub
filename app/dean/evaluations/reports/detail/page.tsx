import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import { getDeanEvalReportData } from "@/features/evaluations/evaluation-report.service"
import EvaluationReportContent from "@/features/evaluations/components/EvaluationReportContent"

export default async function DeanEvalReportDetailPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "DEAN"))
    redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const data = await getDeanEvalReportData(userId)

  return (
    <EvaluationReportContent
      role="dean"
      evaluationPeriodId={data.evaluationPeriodId}
      initialData={data}
    />
  )
}
