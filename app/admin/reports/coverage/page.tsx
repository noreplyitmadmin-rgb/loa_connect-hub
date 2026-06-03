import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getConsultationCoverageData } from "@/lib/controllers/coverage-reports"
import { CoverageReport } from "@/components/reports/CoverageReport"
import { ReportFiltersWithDept } from "@/components/reports/ReportFiltersWithDept"
import { resolveReportDepartment, getDefaultDateRange } from "@/lib/utils/report-helpers"
import { Suspense } from "react"

export default async function CoverageReportPage(props: {
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
    data = await getConsultationCoverageData(departmentId, filters)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Consultation Coverage Report</h1>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-500">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <Suspense fallback={<div className="h-12" />}>
        <ReportFiltersWithDept
          departments={departments}
          selectedDepartmentId={departmentId}
          isDean={isDean}
        />
      </Suspense>

      <CoverageReport
        overall={data.overall}
        byDepartment={data.byDepartment}
        trend={data.trend}
        departmentName={data.departmentName}
      />
    </div>
  )
}
