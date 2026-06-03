"use client"

import { useCallback, useMemo } from "react"
import type { ResponseTimeStats, FacultyResponseTime, ResponseTimeDistribution } from "@/lib/types"
import { ResponseTimeKpiCards } from "@/components/reports/ResponseTimeKpiCards"
import { ResponseTimeDistributionChart } from "@/components/reports/ResponseTimeDistributionChart"

interface ResponsivenessReportProps {
  stats: ResponseTimeStats
  byFaculty: FacultyResponseTime[]
  distribution: ResponseTimeDistribution[]
  departmentName: string
}

function formatHours(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`
  }
  const days = Math.floor(hours / 24)
  const remaining = Math.round((hours % 24) * 10) / 10
  return `${days}d ${remaining}h`
}

export function ResponsivenessReport({
  stats,
  byFaculty,
  distribution,
  departmentName,
}: ResponsivenessReportProps) {
  const hasData = stats.totalResponded > 0

  const sortedFaculty = useMemo(() =>
    [...byFaculty].sort((a, b) => a.averageHours - b.averageHours),
    [byFaculty]
  )

  const exporter = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const esc = (val: unknown): string => {
      const str = String(val ?? "")
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvRows: string[][] = [
      ["Turn-around Time (TAT) Report"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Average Response Time", `${stats.averageHours.toFixed(1)} hours`],
      ["Median Response Time", `${stats.medianHours.toFixed(1)} hours`],
      ["Fastest Response", `${stats.fastestHours.toFixed(1)} hours`],
      ["Slowest Response", `${stats.slowestHours.toFixed(1)} hours`],
      ["Total Responded", String(stats.totalResponded)],
      [],
      ["Response Time Distribution"],
      ["Bucket", "Count"],
      ...distribution.map((d) => [d.label, String(d.count)]),
      [],
      ["Per-Faculty Response Times"],
      ["Faculty", "Avg (hours)", "Fastest (hours)", "Slowest (hours)", "Responded"],
      ...byFaculty.map((f) => [
        esc(f.facultyName),
        String(f.averageHours),
        String(f.fastestHours),
        String(f.slowestHours),
        String(f.totalResponded),
      ]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `TAT_Report_${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [stats, byFaculty, distribution, departmentName])

  const exportExcel = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const esc = (val: unknown): string => {
      const str = String(val ?? "")
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const csvRows: string[][] = [
      ["Turn-around Time (TAT) Report"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Average Response Time (hours)", String(stats.averageHours)],
      ["Median Response Time (hours)", String(stats.medianHours)],
      ["Fastest Response (hours)", String(stats.fastestHours)],
      ["Slowest Response (hours)", String(stats.slowestHours)],
      ["Total Responded", String(stats.totalResponded)],
      [],
      ["Response Time Distribution"],
      ["Bucket", "Count"],
      ...distribution.map((d) => [d.label, String(d.count)]),
      [],
      ["Per-Faculty Response Times"],
      ["Faculty", "Avg (hours)", "Median (hours)", "Fastest (hours)", "Slowest (hours)", "Responded"],
      ...byFaculty.map((f) => [
        esc(f.facultyName),
        String(f.averageHours),
        String(f.medianHours),
        String(f.fastestHours),
        String(f.slowestHours),
        String(f.totalResponded),
      ]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `TAT_Report_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [stats, byFaculty, distribution, departmentName])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Turn-around Time (TAT) Report</h1>
          <p className="text-sm text-slate-500 mt-1">{departmentName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exporter}
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

      {hasData ? (
        <>
          {/* KPI Cards */}
          <ResponseTimeKpiCards stats={stats} />

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ResponseTimeDistributionChart distribution={distribution} />

            {/* Per-Faculty Table */}
            <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-4">Per-Faculty Response Times</h3>
              {sortedFaculty.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                  No data available
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Avg</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Fastest</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Slowest</th>
                        <th className="text-right px-2 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedFaculty.map((f) => (
                        <tr key={f.facultyId} className="transition-colors duration-150 hover:bg-slate-50">
                          <td className="px-2 py-2 font-medium text-slate-800 whitespace-nowrap">{f.facultyName}</td>
                          <td className="px-2 py-2 text-right font-mono text-sm text-slate-700">{formatHours(f.averageHours)}</td>
                          <td className="px-2 py-2 text-right font-mono text-sm text-emerald-600">{formatHours(f.fastestHours)}</td>
                          <td className="px-2 py-2 text-right font-mono text-sm text-red-500">{formatHours(f.slowestHours)}</td>
                          <td className="px-2 py-2 text-right font-mono text-sm text-slate-500">{f.totalResponded}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-400 text-sm">No responded consultations found for the selected period.</p>
        </div>
      )}
    </div>
  )
}
