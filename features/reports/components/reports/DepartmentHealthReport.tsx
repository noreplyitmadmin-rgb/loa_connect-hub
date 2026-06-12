"use client"

import { useMemo } from "react"
import type { DepartmentSummary, FacultyStatsData, RawAppointmentData, ConsultationSummaryData } from "@/lib/types"
import { DeanReportsTabs } from "@/features/reports/components/reports/DeanReportsTabs"

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
        <div className="rounded-2xl bg-surface p-8 shadow-sm text-center">
          <p className="text-tertiary text-sm">No departments found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
        <div>
          <p className="text-sm text-tertiary">Actionable overview of consultation activity</p>
        </div>

      {/* Date Range Notice */}
      <div className="flex items-center gap-2 rounded-xl bg-surface px-4 py-3 text-xs text-tertiary">
        <svg className="w-4 h-4 shrink-0 text-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

const severityColor = (count: number, threshold: number) => {
  if (count === 0) return { from: "from-emerald-50", to: "to-emerald-100/50", text: "text-emerald-700" }
  if (count <= threshold) return { from: "from-amber-50", to: "to-amber-100/50", text: "text-amber-700" }
  return { from: "from-red-50", to: "to-red-100/50", text: "text-red-700" }
}

function HealthSummaryCard({
  label,
  value,
  detail,
  colors,
}: {
  label: string
  value: string | number
  detail?: string
  colors: { from: string; to: string; text: string }
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors.from} ${colors.to} ${colors.text} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">{label}</p>
      {detail && <p className="text-xs mt-1 opacity-60">{detail}</p>}
    </div>
  )
}

function ActiveCard({ count, total }: { count: number; total: number }) {
  return (
    <HealthSummaryCard
      label="Inactive Faculty"
      value={count}
      detail={`${total - count} of ${total} active`}
      colors={severityColor(count, 3)}
    />
  )
}

function RequestCard({ count }: { count: number }) {
  return (
    <HealthSummaryCard
      label="Unresponded Requests"
      value={count}
      detail="Pending faculty action"
      colors={severityColor(count, 3)}
    />
  )
}

function OverdueCard({ count }: { count: number }) {
  return (
    <HealthSummaryCard
      label="Overdue Completions"
      value={count}
      detail="Approved past scheduled date"
      colors={severityColor(count, 3)}
    />
  )
}
