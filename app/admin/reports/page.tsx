import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getAdminReportData } from "@/lib/controllers/admin-reports"
import { AdminReportsPage } from "@/components/reports/AdminReportsPage"
import { Suspense } from "react"
import { ReportFilters } from "@/components/reports/ReportFilters"
import { getDefaultDateRange } from "@/lib/utils/date"

export default async function AdminReports(props: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; status?: string; departmentId?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const searchParams = await props.searchParams

  const { defaultStartDate, defaultEndDate } = getDefaultDateRange()
  const filters = {
    startDate: searchParams?.startDate || defaultStartDate,
    endDate: searchParams?.endDate || defaultEndDate,
    status: searchParams?.status || undefined,
  }

  const selectedDepartmentId = searchParams?.departmentId || null

  let data
  try {
    data = await getAdminReportData(filters, selectedDepartmentId)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Department Reports</h1>
        <div className="card p-8 bg-white text-center">
          <p className="text-slate-500">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Filters */}
      <Suspense fallback={<div className="h-12" />}>
        <ReportFilters />
      </Suspense>

      <AdminReportsPage
        departments={data.departments}
        selectedDepartmentId={data.selectedDepartmentId}
        departmentName={data.departmentName}
        stats={data.stats}
        rawAppointments={data.rawAppointments}
        summaries={data.summaries}
        departmentFrequency={data.departmentFrequency}
        facultyFrequency={data.facultyFrequency}
        departmentYearlyFrequency={data.departmentYearlyFrequency}
        facultyYearlyFrequency={data.facultyYearlyFrequency}
      />
    </div>
  )
}
