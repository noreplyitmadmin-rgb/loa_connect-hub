import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAdminReportData } from "@/features/reports/admin-reports.controller"
import { DepartmentHealthReport } from "@/features/reports/components/reports/DepartmentHealthReport"
import { ReportFiltersWithDept } from "@/features/reports/components/reports/ReportFiltersWithDept"
import { ReportHeader } from "@/features/reports/components/reports/ReportHeader"
import { resolveReportDepartment } from "@/lib/utils/report-helpers"
import { getDefaultDateRange } from "@/lib/utils/date"
import { Suspense } from "react"

export default async function HealthReportPage(props: {
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
    data = await getAdminReportData(filters, departmentId)
  } catch (err) {
    return (
      <div className="w-full space-y-8 pb-12">
        <ReportHeader title="General Report" />
        <div className="rounded-2xl bg-surface p-8 shadow-sm text-center">
          <p className="text-tertiary">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-8 pb-12">
      <ReportHeader title="General Report">
        <Suspense fallback={<div className="h-12" />}>
          <ReportFiltersWithDept
            departments={departments}
            selectedDepartmentId={departmentId}
            isDean={isDean}
          />
        </Suspense>
      </ReportHeader>

      <DepartmentHealthReport
        departments={data.departments}
        stats={data.stats}
        rawAppointments={data.rawAppointments}
        summaries={data.summaries}
      />
    </div>
  )
}
