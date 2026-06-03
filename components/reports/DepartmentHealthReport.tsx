"use client"

import { useMemo } from "react"
import type { DepartmentSummary, FacultyStatsData, RawAppointmentData, ConsultationSummaryData } from "@/lib/types"
import { DeanReportsTabs } from "@/components/reports/DeanReportsTabs"

interface DepartmentHealthReportProps {
  departments: DepartmentSummary[]
  departmentName?: string
  stats: FacultyStatsData[]
  rawAppointments: RawAppointmentData[]
  summaries: ConsultationSummaryData[]
}

export function DepartmentHealthReport({
  departments,
  stats,
  rawAppointments,
  summaries,
}: DepartmentHealthReportProps) {
  const totals = useMemo(() => {
    const inactiveFaculty = departments.reduce((s, d) => s + d.inactiveFaculty, 0)
    const unresponded = departments.reduce((s, d) => s + d.unresponded, 0)
    const overdueCompletion = departments.reduce((s, d) => s + d.overdueCompletion, 0)
    const totalFaculty = departments.reduce((s, d) => s + d.facultyCount, 0)
    return { inactiveFaculty, unresponded, overdueCompletion, totalFaculty }
  }, [departments])

  if (departments.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Health</h1>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-400 text-sm">No departments found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Department Health</h1>
        <p className="text-sm text-slate-500 mt-1">Actionable overview of consultation activity</p>
      </div>

      {/* Date Range Notice */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/70 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        <svg className="w-4 h-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span>All charts and tables on this page reflect the selected date range above.</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <ActiveCard count={totals.inactiveFaculty} total={totals.totalFaculty} />
        <RequestCard count={totals.unresponded} />
        <OverdueCard count={totals.overdueCompletion} />
      </div>

      {/* Per-Faculty Tabs */}
      <DeanReportsTabs
        stats={stats}
        rawAppointments={rawAppointments}
        summaries={summaries}
      />
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  bg,
  iconBg,
  iconColor,
  iconPath,
  valueColor,
}: {
  label: string
  value: string | number
  detail?: string
  bg: string
  iconBg: string
  iconColor: string
  iconPath: string
  valueColor?: string
}) {
  return (
    <div className={`rounded-2xl border border-slate-200/70 ${bg} p-5 shadow-sm transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
          <svg className={`w-5 h-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500 truncate">{label}</p>
          <p className={`text-2xl font-bold ${valueColor || "text-slate-900"} font-mono mt-0.5`}>{value}</p>
          {detail && <p className="text-[10px] text-slate-400 font-mono">{detail}</p>}
        </div>
      </div>
    </div>
  )
}

function ActiveCard({ count, total }: { count: number; total: number }) {
  const level = count === 0 ? "green" : count <= 3 ? "amber" : "red"
  const config = {
    green: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
    amber: { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600", valueColor: "text-amber-700" },
    red: { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600", valueColor: "text-red-700" },
  }[level]
  return (
    <KpiCard
      label="Inactive Faculty"
      value={count}
      detail={`${total - count} of ${total} active`}
      iconPath="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      {...config}
    />
  )
}

function RequestCard({ count }: { count: number }) {
  const level = count === 0 ? "green" : count <= 3 ? "amber" : "red"
  const config = {
    green: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
    amber: { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600", valueColor: "text-amber-700" },
    red: { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600", valueColor: "text-red-700" },
  }[level]
  return (
    <KpiCard
      label="Unresponded Requests"
      value={count}
      detail="Pending faculty action"
      iconPath="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      {...config}
    />
  )
}

function OverdueCard({ count }: { count: number }) {
  const level = count === 0 ? "green" : count <= 3 ? "amber" : "red"
  const config = {
    green: { bg: "bg-emerald-50", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", valueColor: "text-emerald-700" },
    amber: { bg: "bg-amber-50", iconBg: "bg-amber-100", iconColor: "text-amber-600", valueColor: "text-amber-700" },
    red: { bg: "bg-red-50", iconBg: "bg-red-100", iconColor: "text-red-600", valueColor: "text-red-700" },
  }[level]
  return (
    <KpiCard
      label="Overdue Completions"
      value={count}
      detail="Approved past scheduled date"
      iconPath="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      {...config}
    />
  )
}
