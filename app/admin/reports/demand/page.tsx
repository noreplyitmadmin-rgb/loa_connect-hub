import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDemandReportData } from "@/lib/controllers/demand-reports"
import { DemandTrendReport } from "@/components/reports/DemandTrendReport"

export default async function DemandReportPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  let data
  try {
    data = await getDemandReportData(null)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Consultation Demand Trend Report</h1>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-500">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <DemandTrendReport
        daily={data.daily}
        weekly={data.weekly}
        monthly={data.monthly}
        departmentName={data.departmentName}
      />
    </div>
  )
}
