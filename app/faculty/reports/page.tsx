import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getDeanDepartmentStats } from "@/lib/controllers/reports"
import { ReportFilters } from "@/components/reports/ReportFilters"
import { ReportCharts } from "@/components/reports/ReportCharts"
import { ReportsView } from "@/components/reports/ReportsView"
import { CsvExport } from "@/components/reports/CsvExport"
import { Suspense } from "react"
import { hasRole } from "@/lib/utils/roles"

export default async function DeanReportsPage(props: {
  searchParams?: Promise<{ startDate?: string; endDate?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!hasRole((session.user as any).role, "DEAN")) redirect("/login")

  const searchParams = await props.searchParams
  const deanId = (session.user as any).id

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

  // Compute summary metrics
  const totalConsultations = data.stats.reduce((sum, s) => sum + s.total, 0)
  const totalCompleted = data.stats.reduce((sum, s) => sum + s.completed, 0)
  const totalPending = data.stats.reduce((sum, s) => sum + s.pending, 0)
  const overallCompletionRate = totalConsultations > 0
    ? Math.round((totalCompleted / totalConsultations) * 100)
    : 0

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
          <CsvExport
            departmentName={data.departmentName}
            stats={data.stats}
            rawAppointments={data.rawAppointments}
          />
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-12" />}>
        <ReportFilters />
      </Suspense>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SummaryCard
          label="Total Consultations"
          value={totalConsultations}
          color="blue"
        />
        <SummaryCard
          label="Overall Completion Rate"
          value={`${overallCompletionRate}%`}
          color="green"
        />
        <SummaryCard
          label="Pending Requests"
          value={totalPending}
          color="amber"
        />
      </div>

      {/* Charts */}
      <ReportCharts stats={data.stats} />

      {/* Data View (Summary Table / Timeline Toggle) */}
      <ReportsView stats={data.stats} rawAppointments={data.rawAppointments} />
    </div>
  )
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string
  value: string | number
  color: "blue" | "green" | "amber"
}) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200/60 text-amber-700",
  }

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
    >
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">
        {label}
      </p>
    </div>
  )
}
