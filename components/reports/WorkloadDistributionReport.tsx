"use client"

import { useMemo, useCallback } from "react"
import type { WorkloadDistributionEntry } from "@/lib/types"

interface WorkloadDistributionReportProps {
  entries: WorkloadDistributionEntry[]
  departmentTotal: number
  departmentName: string
  totalConsultations: number
  completedConsultations: number
  pendingConsultations: number
}

export function WorkloadDistributionReport({
  entries,
  departmentTotal,
  departmentName,
  totalConsultations,
  completedConsultations,
  pendingConsultations,
}: WorkloadDistributionReportProps) {
  const hasData = entries.length > 0

  const sorted = useMemo(
    () => [...entries].sort((a, b) => b.total - a.total),
    [entries]
  )

  const maxTotal = useMemo(
    () => Math.max(...entries.map((e) => e.total), 1),
    [entries]
  )

  const esc = useCallback((val: unknown): string => {
    const str = String(val ?? "")
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }, [])

  const exportCSV = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ["Faculty Consultation Load"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Consultations", String(totalConsultations)],
      ["Completed", String(completedConsultations)],
      ["Pending", String(pendingConsultations)],
      [],
      ["Faculty", "Department", "Total", "Completed", "Pending", "Approved", "Rejected", "Cancelled", "Completion Rate", "Dept Share"],
      ...sorted.map((e) => [
        esc(e.facultyName),
        esc(e.departmentName),
        String(e.total),
        String(e.completed),
        String(e.pending),
        String(e.approved),
        String(e.rejected),
        String(e.cancelled),
        `${e.completionRate}%`,
        `${e.departmentShare}%`,
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Faculty_Consultation_Load_${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sorted, totalConsultations, completedConsultations, pendingConsultations, departmentName, esc])

  const exportExcel = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ["Faculty Consultation Load"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Consultations", String(totalConsultations)],
      ["Completed", String(completedConsultations)],
      ["Pending", String(pendingConsultations)],
      [],
      ["Faculty", "Department", "Total", "Completed", "Pending", "Approved", "Rejected", "Cancelled", "Completion Rate", "Dept Share"],
      ...sorted.map((e) => [
        esc(e.facultyName),
        esc(e.departmentName),
        String(e.total),
        String(e.completed),
        String(e.pending),
        String(e.approved),
        String(e.rejected),
        String(e.cancelled),
        `${e.completionRate}%`,
        `${e.departmentShare}%`,
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Faculty_Consultation_Load_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [sorted, totalConsultations, completedConsultations, pendingConsultations, departmentName, esc])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Consultation Load</h1>
          <p className="text-sm text-slate-500 mt-1">{departmentName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </button>
        </div>
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
        <SummaryCard label="Total Consultations" value={totalConsultations} color="blue" />
        <SummaryCard label="Completed" value={completedConsultations} color="green" />
        <SummaryCard label="Pending" value={pendingConsultations} color="amber" />
      </div>

      {/* Horizontal Bar Chart */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Consultation Share by Faculty</h3>
        <p className="text-xs text-slate-400 mb-5">Horizontal bars showing each faculty&apos;s consultation volume relative to the department total</p>

        {hasData ? (
          <div className="space-y-4">
            {sorted.map((entry) => {
              const pct = (entry.total / maxTotal) * 100
              const shareColor =
                entry.departmentShare >= 30
                  ? "bg-emerald-400"
                  : entry.departmentShare >= 15
                    ? "bg-amber-400"
                    : "bg-blue-400"
              return (
                <div key={entry.facultyId}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-slate-700 truncate">{entry.facultyName}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">({entry.departmentName})</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-2">
                      <span className="font-mono text-slate-500">{entry.total}</span>
                      <span className="font-mono text-xs font-semibold min-w-[3rem] text-right">{entry.departmentShare}%</span>
                    </div>
                  </div>
                  <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${shareColor}`}
                      style={{ width: `${Math.max(pct, entry.total > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                    <span>{entry.completed} completed / {entry.pending} pending</span>
                    <span>{entry.completionRate}% rate</span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
            No data available
          </div>
        )}
      </div>

      {/* Distribution Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Faculty Load Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-amber-600">Pending</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-600">Approved</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-red-600">Rejected</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelled</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Rate</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/30 font-medium">
                <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap" colSpan={2}>
                  {entries.length} Faculty
                </td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{departmentTotal}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-emerald-600">{completedConsultations}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-amber-600">{pendingConsultations}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-blue-600">{entries.reduce((s, e) => s + e.approved, 0)}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-red-600">{entries.reduce((s, e) => s + e.rejected, 0)}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">{entries.reduce((s, e) => s + e.cancelled, 0)}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">
                  {departmentTotal > 0 ? Math.round((completedConsultations / departmentTotal) * 100) : 0}%
                </td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">100%</td>
              </tr>
              {sorted.map((entry) => (
                <tr key={entry.facultyId} className="transition-colors duration-150 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{entry.facultyName}</td>
                  <td className="px-4 py-4 text-sm text-slate-500">{entry.departmentName}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{entry.total}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-emerald-600">{entry.completed}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-amber-600">{entry.pending}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-blue-600">{entry.approved}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-red-600">{entry.rejected}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">{entry.cancelled}</td>
                  <td className="px-4 py-4 text-center">
                    <RateBadge rate={entry.completionRate} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <ShareBadge share={entry.departmentShare} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: "blue" | "green" | "amber" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200/60 text-amber-700",
  }
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">{label}</p>
    </div>
  )
}

function RateBadge({ rate }: { rate: number }) {
  const colors = rate >= 80
    ? "bg-emerald-100 text-emerald-800 before:bg-emerald-500"
    : rate >= 50
      ? "bg-amber-100 text-amber-800 before:bg-amber-500"
      : "bg-red-100 text-red-800 before:bg-red-500"
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colors} before:w-1.5 before:h-1.5 before:rounded-full transition-all duration-200`}>
      {rate}%
    </span>
  )
}

function ShareBadge({ share }: { share: number }) {
  const colors = share >= 30
    ? "bg-purple-100 text-purple-800"
    : share >= 15
      ? "bg-indigo-100 text-indigo-800"
      : "bg-slate-100 text-slate-800"
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${colors} transition-all duration-200`}>
      {share}%
    </span>
  )
}
