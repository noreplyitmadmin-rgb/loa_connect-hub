"use client"

import { useCallback } from "react"
import type { BacklogEntry, BacklogAgingBucket, BacklogSummary } from "@/lib/types"
import { BacklogAgingTable } from "@/components/reports/BacklogAgingTable"
import { BacklogStackedBarChart } from "@/components/reports/BacklogStackedBarChart"

interface BacklogReportProps {
  entries: BacklogEntry[]
  agingBuckets: BacklogAgingBucket[]
  summary: BacklogSummary
  departmentName: string
  byFaculty: { facultyName: string; buckets: { label: string; count: number }[] }[]
}

export function BacklogReport({
  entries,
  agingBuckets,
  summary,
  departmentName,
  byFaculty,
}: BacklogReportProps) {
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
      ["Faculty Response Monitor"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Unresolved", String(summary.totalUnresolved)],
      ["Pending", String(summary.totalPending)],
      ["Approved but Incomplete", String(summary.totalApproved)],
      ["Oldest (days)", String(summary.oldestDays)],
      ["Oldest Date", summary.oldestDate || "N/A"],
      ["Oldest Faculty", esc(summary.oldestFaculty)],
      ["Oldest Student", esc(summary.oldestStudent)],
      [],
      ["Aging Buckets"],
      ["Bucket", "Count"],
      ...agingBuckets.map((b) => [b.label, String(b.count)]),
      [],
      ["Detailed Backlog"],
      ["Faculty", "Student", "Date", "Start", "End", "Status", "Age (days)", "Aging Bucket", "Title"],
      ...entries.map((e) => [
        esc(e.facultyName),
        esc(e.studentName),
        e.date,
        e.startTime,
        e.endTime,
        e.status,
        String(e.ageDays),
        e.agingBucket,
        esc(e.title || ""),
      ]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Faculty_Response_Monitor_${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [entries, agingBuckets, summary, departmentName])

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
      ["Faculty Response Monitor"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Unresolved", String(summary.totalUnresolved)],
      ["Pending", String(summary.totalPending)],
      ["Approved but Incomplete", String(summary.totalApproved)],
      ["Oldest (days)", String(summary.oldestDays)],
      ["Oldest Date", summary.oldestDate || "N/A"],
      ["Oldest Faculty", esc(summary.oldestFaculty)],
      ["Oldest Student", esc(summary.oldestStudent)],
      [],
      ["Aging Buckets"],
      ["Bucket", "Count"],
      ...agingBuckets.map((b) => [b.label, String(b.count)]),
      [],
      ["Detailed Backlog"],
      ["Faculty", "Student", "Date", "Start", "End", "Status", "Age (days)", "Aging Bucket", "Title"],
      ...entries.map((e) => [
        esc(e.facultyName),
        esc(e.studentName),
        e.date,
        e.startTime,
        e.endTime,
        e.status,
        String(e.ageDays),
        e.agingBucket,
        esc(e.title || ""),
      ]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Faculty_Response_Monitor_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [entries, agingBuckets, summary, departmentName])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faculty Response Monitor</h1>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard
          label="Total Unresolved"
          value={summary.totalUnresolved}
          color={summary.totalUnresolved > 0 ? "amber" : "green"}
        />
        <SummaryCard
          label="Pending"
          value={summary.totalPending}
          color={summary.totalPending > 0 ? "amber" : "green"}
        />
        <SummaryCard
          label="Approved (Incomplete)"
          value={summary.totalApproved}
          color={summary.totalApproved > 0 ? "blue" : "green"}
        />
        <SummaryCard
          label="Oldest (Days)"
          value={summary.oldestDays}
          color={summary.oldestDays > 14 ? "red" : summary.oldestDays > 7 ? "amber" : "green"}
        />
      </div>

      {/* Chart + Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BacklogStackedBarChart byFaculty={byFaculty} />
        {agingBuckets.length > 0 && (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 mb-4">Aging Bucket Summary</h3>
            <div className="space-y-3">
              {agingBuckets.map((bucket) => {
                const maxCount = Math.max(...agingBuckets.map((b) => b.count), 1)
                const pct = (bucket.count / maxCount) * 100
                const barColor =
                  bucket.label === "0 - 3 Days" ? "bg-emerald-400" :
                  bucket.label === "4 - 7 Days" ? "bg-amber-400" :
                  bucket.label === "8 - 14 Days" ? "bg-orange-400" :
                  "bg-red-400"

                return (
                  <div key={bucket.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">{bucket.label}</span>
                      <span className="font-mono text-slate-500">{bucket.count}</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.max(pct, bucket.count > 0 ? 2 : 0)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Aging Table */}
      <BacklogAgingTable entries={entries} />
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
  color: "blue" | "green" | "amber" | "red"
}) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200/60 text-amber-700",
    red: "from-red-50 to-red-100/50 border-red-200/60 text-red-700",
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-gradient-to-br ${colorClasses[color]} p-6 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}>
      <p className="text-4xl font-bold tracking-tight">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-wider mt-1.5 opacity-75">{label}</p>
    </div>
  )
}
