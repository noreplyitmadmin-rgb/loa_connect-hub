import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDeanDepartmentStats } from "@/lib/controllers/reports"
import { ReportFilters } from "@/components/reports/ReportFilters"
import { DeanReportsTabs } from "@/components/reports/DeanReportsTabs"
import { CsvExport } from "@/components/reports/CsvExport"
import { PdfExport } from "@/components/reports/PdfExport"
import { Suspense } from "react"

export default async function DeanReportsPage(props: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const searchParams = await props.searchParams
  const deanId = (session.user as Record<string, unknown>).id as string

  const filters = {
    startDate: searchParams?.startDate || undefined,
    endDate: searchParams?.endDate || undefined,
    status: searchParams?.status || undefined,
  }

  let data
  try {
    data = await getDeanDepartmentStats(deanId, filters)
  } catch (err) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        <h1 className="text-2xl font-bold text-slate-900">Department Performance Report</h1>
        <div className="card p-8 bg-white text-center">
          <p className="text-slate-500">{(err as Error).message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Department Performance Report
          </h1>
          <p className="text-base text-slate-500 mt-1 font-medium">{data.departmentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <PdfExport
            departmentName={data.departmentName}
            stats={data.stats}
            rawAppointments={data.rawAppointments}
            summaries={data.summaries}
            departmentFrequency={data.departmentFrequency}
            facultyFrequency={data.facultyFrequency}
            departmentYearlyFrequency={data.departmentYearlyFrequency}
            facultyYearlyFrequency={data.facultyYearlyFrequency}
          />
          <CsvExport
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
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-12" />}>
        <ReportFilters />
      </Suspense>

      {/* Tab content (client-side switching) */}
      <DeanReportsTabs
        stats={data.stats}
        rawAppointments={data.rawAppointments}
        summaries={data.summaries}
        departmentFrequency={data.departmentFrequency}
        facultyFrequency={data.facultyFrequency}
        departmentYearlyFrequency={data.departmentYearlyFrequency}
        facultyYearlyFrequency={data.facultyYearlyFrequency}
        deanId={deanId}
      />
    </div>
  )
}
