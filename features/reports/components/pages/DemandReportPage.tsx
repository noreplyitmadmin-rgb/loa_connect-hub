import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDemandReportData } from "@/features/reports/demand.controller"
import { DemandTrendReport } from "@/features/reports/components/reports/DemandTrendReport"
import { ReportFiltersWithDept } from "@/features/reports/components/reports/ReportFiltersWithDept"
import { resolveReportDepartment } from "@/lib/utils/report-helpers"
import { getDefaultDateRange } from "@/lib/utils/date"
import { Suspense } from "react"

export default async function DemandReportPage(props: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; departmentId?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const searchParams = await props.searchParams
  const { departmentId, departments, isDean } = await resolveReportDepartment(session, searchParams?.departmentId || null)

  const { defaultStartDate, defaultEndDate } = getDefaultDateRange()
  const filters = {
    startDate: searchParams?.startDate || defaultStartDate,
    endDate: searchParams?.endDate || defaultEndDate,
    status: searchParams?.status || undefined,
  }

  let data
  try {
    data = await getDemandReportData(departmentId, filters)
  } catch (err) {
    return (
      <div className="w-full space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-primary">Consultation Demand Trend Report</h1>
        <div className="rounded-2xl border border-default/70 bg-surface p-8 shadow-sm text-center">
          <p className="text-tertiary">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <Suspense fallback={<div className="h-12" />}>
        <ReportFiltersWithDept
          departments={departments}
          selectedDepartmentId={departmentId}
          isDean={isDean}
        />
      </Suspense>

      <DemandTrendReport
        daily={data.daily}
        weekly={data.weekly}
        monthly={data.monthly}
        departmentName={data.departmentName}
      />
    </div>
  )
}
