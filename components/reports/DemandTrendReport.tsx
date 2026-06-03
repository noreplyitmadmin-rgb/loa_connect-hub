"use client"

import { useState, useMemo, useCallback } from "react"
import type { DailyFrequencyData, WeeklyFrequencyData, DepartmentFrequencyEntry } from "@/lib/types"
import { DemandLineChart } from "@/components/reports/DemandLineChart"
import { DemandBarChart } from "@/components/reports/DemandBarChart"

type Granularity = "daily" | "weekly" | "monthly"

interface DemandTrendReportProps {
  daily: DailyFrequencyData[]
  weekly: WeeklyFrequencyData[]
  monthly: DepartmentFrequencyEntry[]
  departmentName: string
}

export function DemandTrendReport({
  daily,
  weekly,
  monthly,
  departmentName,
}: DemandTrendReportProps) {
  const [granularity, setGranularity] = useState<Granularity>("monthly")

  const { data, title } = useMemo(() => {
    switch (granularity) {
      case "daily":
        return {
          data: daily.map((d) => ({ label: d.date.slice(5), count: d.count })),
          title: "Daily Consultation Demand",
        }
      case "weekly":
        return {
          data: weekly.map((w) => ({ label: w.label, count: w.count })),
          title: "Weekly Consultation Demand",
        }
      case "monthly":
        return {
          data: monthly.map((m) => ({ label: m.monthName.slice(0, 3), count: m.count })),
          title: "Monthly Consultation Demand",
        }
    }
  }, [granularity, daily, weekly, monthly])

  const totals = useMemo(() => {
    const total = data.reduce((s, d) => s + d.count, 0)
    const avg = data.length > 0 ? Math.round((total / data.length) * 10) / 10 : 0
    const max = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0
    return { total, avg, max }
  }, [data])

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
      ["Consultation Demand Trend Report"],
      [`Department: ${departmentName}`],
      [],
      ["Daily Demand"],
      ["Date", "Day", "Count"],
      ...daily.map((d) => [d.date, d.dayName, String(d.count)]),
      [],
      ["Weekly Demand"],
      ["Week Start", "Week End", "Label", "Count"],
      ...weekly.map((w) => [w.weekStart, w.weekEnd, esc(w.label), String(w.count)]),
      [],
      ["Monthly Demand"],
      ["Month", "Year", "Count"],
      ...monthly.map((m) => [m.monthName, String(m.year), String(m.count)]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Demand_Trend_${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [daily, weekly, monthly, departmentName])

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
      ["Consultation Demand Trend Report"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Consultations", String(totals.total)],
      ["Average per Period", String(totals.avg)],
      ["Peak", String(totals.max)],
      [],
      ["Daily Demand"],
      ["Date", "Day", "Count"],
      ...daily.map((d) => [d.date, d.dayName, String(d.count)]),
      [],
      ["Weekly Demand"],
      ["Week Start", "Week End", "Label", "Count"],
      ...weekly.map((w) => [w.weekStart, w.weekEnd, esc(w.label), String(w.count)]),
      [],
      ["Monthly Demand"],
      ["Month", "Year", "Count"],
      ...monthly.map((m) => [m.monthName, String(m.year), String(m.count)]),
    ]

    const csv = csvRows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Demand_Trend_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [daily, weekly, monthly, totals, departmentName])

  const hasData = data.length > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Demand Trend Report</h1>
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <SummaryCard label="Total Consultations" value={totals.total} color="blue" />
        <SummaryCard label="Average per Period" value={totals.avg} color="green" />
        <SummaryCard label="Peak Demand" value={totals.max} color="amber" />
      </div>

      {/* Granularity Toggle */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit transition-all duration-200">
        {(["daily", "weekly", "monthly"] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => setGranularity(g)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
              granularity === g
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Charts */}
      {hasData ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DemandLineChart data={data} title={title} />
          <DemandBarChart data={data} title={title} />
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
          <p className="text-slate-400 text-sm">No consultation data found for the selected period.</p>
        </div>
      )}
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
