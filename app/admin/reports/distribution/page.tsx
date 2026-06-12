import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getWorkloadDistributionData } from "@/features/reports/distribution.service"
import { WorkloadDistributionReport } from "@/features/reports/components/reports/WorkloadDistributionReport"
import { ReportFiltersWithDept } from "@/features/reports/components/reports/ReportFiltersWithDept"
import { ReportHeader } from "@/features/reports/components/reports/ReportHeader"
import { resolveReportDepartment } from "@/lib/utils/report-helpers"
import { getDefaultDateRange } from "@/lib/utils/date"
import { Suspense } from "react"

export default async function DistributionPage(props: {
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
    data = await getWorkloadDistributionData(departmentId, filters)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <ReportHeader title="Distribution Report" />
        <div className="rounded-2xl bg-surface p-8 shadow-sm text-center">
          <p className="text-tertiary">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <ReportHeader title="Distribution Report">
        <Suspense fallback={<div className="h-12" />}>
          <ReportFiltersWithDept
            departments={departments}
            selectedDepartmentId={departmentId}
            isDean={isDean}
          />
        </Suspense>
      </ReportHeader>

      <WorkloadDistributionReport
        entries={data.entries}
        departmentTotal={data.departmentTotal}
        departmentName={data.departmentName}
        totalConsultations={data.totalConsultations}
        completedConsultations={data.completedConsultations}
        pendingConsultations={data.pendingConsultations}
      />
    </div>
  )
}
