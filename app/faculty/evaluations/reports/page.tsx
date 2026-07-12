import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { hasRole } from "@/lib/utils/roles"
import { getFacultyEvalReportData } from "@/features/evaluations/evaluation-report.service"
import EvaluationReportContent from "@/features/evaluations/components/EvaluationReportContent"

export default async function FacultyEvalReportPage() {
  const session = await auth()
  if (!session?.user || !hasRole((session.user as Record<string, unknown>).role as string, "FACULTY"))
    redirect("/login")

  const userId = (session.user as Record<string, unknown>).id as string
  const data = await getFacultyEvalReportData(userId)

  return (
    <EvaluationReportContent
      role="faculty"
      evaluationPeriodId={data.evaluationPeriodId}
      initialData={data}
    />
  )
}
