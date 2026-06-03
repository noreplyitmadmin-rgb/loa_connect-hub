import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getResponsivenessReportData } from "@/lib/controllers/responsiveness-reports"
import { ResponsivenessReport } from "@/components/reports/ResponsivenessReport"
import { ReportFiltersWithDept } from "@/components/reports/ReportFiltersWithDept"
import { resolveReportDepartment } from "@/lib/utils/report-helpers"
import { getDefaultDateRange } from "@/lib/utils/date"
import { Suspense } from "react"

export default async function ResponsivenessPage(props: {
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
    data = await getResponsivenessReportData(departmentId, filters)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Department Responsiveness Report</h1>
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

      <ResponsivenessReport
        stats={data.stats}
        byFaculty={data.byFaculty}
        distribution={data.distribution}
        departmentName={data.departmentName}
      />
    </div>
  )
}
