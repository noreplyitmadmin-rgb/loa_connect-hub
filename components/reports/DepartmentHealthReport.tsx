"use client"

import { useMemo, useCallback, useRef } from "react"
import type { DepartmentSummary } from "@/lib/types"
import { KpiCards } from "@/components/reports/KpiCards"
import { StatusDistributionChart } from "@/components/reports/StatusDistributionChart"

interface DepartmentHealthReportProps {
  departments: DepartmentSummary[]
}

export function DepartmentHealthReport({ departments }: DepartmentHealthReportProps) {
  const reportRef = useRef<HTMLDivElement>(null)

  const totals = useMemo(() => {
    const total = departments.reduce((s, d) => s + d.total, 0)
    const completed = departments.reduce((s, d) => s + d.completed, 0)
    const pending = departments.reduce((s, d) => s + d.pending, 0)
    const approved = departments.reduce((s, d) => s + d.approved, 0)
    const rejected = departments.reduce((s, d) => s + d.rejected, 0)
    const cancelled = departments.reduce((s, d) => s + d.cancelled, 0)
    return {
      total,
      completed,
      pending,
      approved,
      rejected,
      cancelled,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  }, [departments])

  // ── CSV Export ──────────────────────────────────
  const esc = useCallback((val: unknown): string => {
    const str = String(val ?? "")
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }, [])

  const downloadCSV = useCallback((rows: string[][], filename: string) => {
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [])

  const exportCSV = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = []
    rows.push(["Department", "Faculty Count", "Total", "Completed", "Pending", "Approved", "Rejected", "Cancelled", "Completion Rate"])
    for (const d of departments) {
      rows.push([
        esc(d.name), String(d.facultyCount), String(d.total),
        String(d.completed), String(d.pending), String(d.approved),
        String(d.rejected), String(d.cancelled), `${d.completionRate}%`,
      ])
    }
    downloadCSV(rows, `Health_Report_${dateStr}.csv`)
  }, [departments, esc, downloadCSV])

  // ── Excel Export (client-side XLSX via CSV) ────
  const exportExcel = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const csvRows: string[][] = [
      ["Department Consultation Health Report"],
      [],
      ["Metric", "Value"],
      ["Total Consultations", String(totals.total)],
      ["Completed", String(totals.completed)],
      ["Pending", String(totals.pending)],
      ["Approved", String(totals.approved)],
      ["Rejected", String(totals.rejected)],
      ["Cancelled", String(totals.cancelled)],
      ["Completion Rate", `${totals.completionRate}%`],
      [],
      ["Department", "Faculty Count", "Total", "Completed", "Pending", "Approved", "Rejected", "Cancelled", "Completion Rate"],
      ...departments.map((d) => [
        esc(d.name), String(d.facultyCount), String(d.total),
        String(d.completed), String(d.pending), String(d.approved),
        String(d.rejected), String(d.cancelled), `${d.completionRate}%`,
      ]),
    ]
    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Health_Report_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [departments, totals, esc])

  if (departments.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Consultation Health Report</h1>
        </div>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-400 text-sm">No departments found.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8" ref={reportRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Consultation Health Report</h1>
          <p className="text-sm text-slate-500 mt-1">Overview of all departments</p>
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

      {/* KPI Cards */}
      <KpiCards {...totals} />

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusDistributionChart {...totals} />
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Completion Rate by Department</h3>
          {departments.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No data available
            </div>
          ) : (
            <div className="space-y-3">
              {[...departments]
                .sort((a, b) => b.completionRate - a.completionRate)
                .map((dept) => (
                  <div key={dept.id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700 truncate">{dept.name}</span>
                      <span className="font-mono text-slate-500 ml-2">{dept.completionRate}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          dept.completionRate >= 80
                            ? "bg-emerald-400"
                            : dept.completionRate >= 50
                              ? "bg-amber-400"
                              : "bg-red-400"
                        }`}
                        style={{ width: `${dept.completionRate}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>{dept.completed}/{dept.total} completed</span>
                      <span>{dept.facultyCount} faculty</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Summary Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Department Summary</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-600">Completed</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-amber-600">Pending</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-blue-600">Approved</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-red-600">Rejected</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Cancelled</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr className="bg-slate-50/30 font-medium">
                <td className="px-6 py-4 font-bold text-slate-900 whitespace-nowrap">All Departments</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{departments.reduce((s, d) => s + d.facultyCount, 0)}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{totals.total}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-emerald-600">{totals.completed}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-amber-600">{totals.pending}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-blue-600">{totals.approved}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-red-600">{totals.rejected}</td>
                <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">{totals.cancelled}</td>
                <td className="px-4 py-4 text-center">
                  <CompletionBadge rate={totals.completionRate} />
                </td>
              </tr>
              {departments.map((dept) => (
                <tr key={dept.id} className="transition-colors duration-150 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{dept.name}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{dept.facultyCount}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{dept.total}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-emerald-600">{dept.completed}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-amber-600">{dept.pending}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-blue-600">{dept.approved}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-red-600">{dept.rejected}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-500">{dept.cancelled}</td>
                  <td className="px-4 py-4 text-center">
                    <CompletionBadge rate={dept.completionRate} />
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

function CompletionBadge({ rate }: { rate: number }) {
  let bg: string
  let text: string
  let dot: string

  if (rate >= 80) {
    bg = "bg-emerald-100"
    text = "text-emerald-800"
    dot = "bg-emerald-500"
  } else if (rate >= 50) {
    bg = "bg-amber-100"
    text = "text-amber-800"
    dot = "bg-amber-500"
  } else {
    bg = "bg-red-100"
    text = "text-red-800"
    dot = "bg-red-500"
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text} transition-all duration-200`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {rate}%
    </span>
  )
}
