"use client"

import { useState, useCallback } from "react"
import type {
  DepartmentFrequencyEntry,
  FacultyFrequencyData,
  DepartmentYearlyEntry,
  FacultyYearlyData,
  FacultyStatsData,
} from "@/lib/types"
import { FacultyCards } from "./FacultyCards"

interface FrequencyViewProps {
  departmentFrequency: DepartmentFrequencyEntry[]
  facultyFrequency: FacultyFrequencyData[]
  departmentYearlyFrequency: DepartmentYearlyEntry[]
  facultyYearlyFrequency: FacultyYearlyData[]
  stats: FacultyStatsData[]
  deanId: string
}

export function FrequencyView({
  departmentFrequency,
  facultyFrequency,
  departmentYearlyFrequency,
  facultyYearlyFrequency,
  stats,
  deanId,
}: FrequencyViewProps) {
  const [granularity, setGranularity] = useState<"monthly" | "yearly">("monthly")

  const handleExport = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const filename = `Frequency_Report_${dateStr}.csv`

    const esc = (val: unknown): string => {
      const str = String(val ?? "")
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    const lines: string[] = []

    lines.push("Department-wide Monthly Frequency")
    lines.push("Month,Year,Count")
    for (const f of departmentFrequency) {
      lines.push([f.monthName, f.year, f.count].join(","))
    }
    lines.push("")

    lines.push("Per-Faculty Monthly Breakdown")
    lines.push("Faculty,Month,Count")
    for (const f of facultyFrequency) {
      for (const mc of f.monthlyCounts) {
        lines.push([esc(f.facultyName), mc.monthName, mc.count].join(","))
      }
    }
    lines.push("")

    lines.push("Department-wide Yearly Frequency")
    lines.push("Year,Count")
    for (const f of departmentYearlyFrequency) {
      lines.push([f.year, f.count].join(","))
    }
    lines.push("")

    lines.push("Per-Faculty Yearly Breakdown")
    lines.push("Faculty,Year,Count")
    for (const f of facultyYearlyFrequency) {
      for (const yc of f.yearlyCounts) {
        lines.push([esc(f.facultyName), yc.year, yc.count].join(","))
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [departmentFrequency, facultyFrequency, departmentYearlyFrequency, facultyYearlyFrequency])

  return (
    <div className="space-y-6">
      {/* A. Granularity Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit transition-all duration-200">
          <button
            onClick={() => setGranularity("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              granularity === "monthly"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setGranularity("yearly")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
              granularity === "yearly"
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Yearly
          </button>
        </div>

        <button
          onClick={handleExport}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/70 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* B. Summary Cards */}
      {granularity === "monthly" ? (
        <MonthlySummaryCards entries={departmentFrequency} />
      ) : (
        <YearlySummaryCards entries={departmentYearlyFrequency} />
      )}

      {/* C. Department Trend Chart */}
      {granularity === "monthly" ? (
        <DepartmentFrequencyChart entries={departmentFrequency} />
      ) : (
        <DepartmentYearlyChart entries={departmentYearlyFrequency} />
      )}

      {/* D. Per-Faculty Breakdown Table */}
      {granularity === "monthly" ? (
        <FacultyFrequencyTable data={facultyFrequency} deanId={deanId} />
      ) : (
        <FacultyYearlyTable data={facultyYearlyFrequency} deanId={deanId} />
      )}

      {/* E. FacultyCards */}
      <FacultyCards stats={stats} facultyFrequency={facultyFrequency} deanId={deanId} />
    </div>
  )
}

// ─── Summary Cards ────────────────────────────

function MonthlySummaryCards({ entries }: { entries: DepartmentFrequencyEntry[] }) {
  const total = entries.reduce((s, e) => s + e.count, 0)
  const avg = entries.length > 0 ? total / entries.length : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard label="Total Consultations" value={total} color="blue" />
      <SummaryCard label="Average per Month" value={avg.toFixed(1)} color="green" />
      <SummaryCard label="Total Months" value={entries.length} color="amber" />
    </div>
  )
}

function YearlySummaryCards({ entries }: { entries: DepartmentYearlyEntry[] }) {
  const total = entries.reduce((s, e) => s + e.count, 0)
  const avg = entries.length > 0 ? total / entries.length : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <SummaryCard label="Total Consultations" value={total} color="blue" />
      <SummaryCard label="Average per Year" value={avg.toFixed(1)} color="green" />
      <SummaryCard label="Total Years" value={entries.length} color="amber" />
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

// ─── Department Monthly Chart (Line Graph) ────

function DepartmentFrequencyChart({ entries }: { entries: DepartmentFrequencyEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Department-wide Consultation Frequency</h3>
        <p className="text-xs text-slate-400 mb-5">Monthly consultation count</p>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  const total = entries.reduce((s, e) => s + e.count, 0)
  const avg = total / entries.length
  const maxCount = Math.max(...entries.map((e) => e.count), 1)

  const width = 700
  const height = 220
  const padding = { top: 20, right: 30, bottom: 44, left: 44 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const stepX = entries.length > 1 ? plotWidth / (entries.length - 1) : 0

  // Build polyline points string
  const points = entries
    .map((e, i) => {
      const x = padding.left + i * stepX
      const y = padding.top + plotHeight - (e.count / maxCount) * plotHeight
      return `${x},${y}`
    })
    .join(" ")

  // Y-axis ticks
  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxCount / yTickCount) * i)
  )

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Department-wide Consultation Frequency</h3>
      <p className="text-xs text-slate-400 mb-5">Monthly consultation count</p>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-full"
        >
          {/* Y-axis grid lines + labels */}
          {yTicks.map((tick, index) => {
            const y = padding.top + plotHeight - (tick / maxCount) * plotHeight
            return (
              <g key={`ytick-${tick}-${index}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-medium"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Average line */}
          {avg > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={padding.top + plotHeight - (avg / maxCount) * plotHeight}
                x2={width - padding.right}
                y2={padding.top + plotHeight - (avg / maxCount) * plotHeight}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text
                x={width - padding.right - 4}
                y={padding.top + plotHeight - (avg / maxCount) * plotHeight - 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-medium"
              >
                Avg: {avg.toFixed(1)}
              </text>
            </g>
          )}

          {/* Area fill under the line */}
          {entries.length > 1 && (
            <polygon
              points={`${padding.left},${padding.top + plotHeight} ${points} ${padding.left + (entries.length - 1) * stepX},${padding.top + plotHeight}`}
              fill="url(#monthlyGradient)"
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a047" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#d4a047" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Line */}
          {entries.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="#d4a047"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Points + labels */}
          {entries.map((entry, i) => {
            const x = padding.left + i * stepX
            const y = padding.top + plotHeight - (entry.count / maxCount) * plotHeight
            return (
              <g key={entry.month}>
                {/* Value label */}
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  className="fill-slate-600 text-[11px] font-semibold font-mono"
                >
                  {entry.count}
                </text>
                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  className="fill-white stroke-gold-500"
                  strokeWidth={2.5}
                />
                {/* X-axis label */}
                <text
                  x={x}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {entry.monthName.slice(0, 3)}
                </text>
                {/* Year label (show once per year) */}
                {i === 0 || entries[i - 1].year !== entry.year ? (
                  <text
                    x={x}
                    y={padding.top + plotHeight + 30}
                    textAnchor="middle"
                    className="fill-slate-400 text-[9px]"
                  >
                    {entry.year}
                  </text>
                ) : null}
              </g>
            )
          })}

          {/* Single point (no line possible) */}
          {entries.length === 1 && (
            <circle
              cx={padding.left}
              cy={padding.top + plotHeight - (entries[0].count / maxCount) * plotHeight}
              r={4}
              className="fill-white stroke-gold-500"
              strokeWidth={2.5}
            />
          )}
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-[3px] rounded-full bg-gold-500" />
          <span className="text-xs text-slate-500">Consultations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 inline-block border-t-2 border-dashed border-slate-400" />
          <span className="text-xs text-slate-500">Average</span>
        </div>
      </div>
    </div>
  )
}

// ─── Department Yearly Chart (Line Graph) ─────

function DepartmentYearlyChart({ entries }: { entries: DepartmentYearlyEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
        <h3 className="text-sm font-bold text-slate-800 mb-1">Department-wide Consultation Frequency</h3>
        <p className="text-xs text-slate-400 mb-5">Yearly consultation count</p>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  const total = entries.reduce((s, e) => s + e.count, 0)
  const avg = total / entries.length
  const maxCount = Math.max(...entries.map((e) => e.count), 1)

  const width = 700
  const height = 220
  const padding = { top: 20, right: 30, bottom: 44, left: 44 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const stepX = entries.length > 1 ? plotWidth / (entries.length - 1) : 0

  // Build polyline points string
  const points = entries
    .map((e, i) => {
      const x = padding.left + i * stepX
      const y = padding.top + plotHeight - (e.count / maxCount) * plotHeight
      return `${x},${y}`
    })
    .join(" ")

  // Y-axis ticks
  const yTickCount = 4
  const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) =>
    Math.round((maxCount / yTickCount) * i)
  )

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Department-wide Consultation Frequency</h3>
      <p className="text-xs text-slate-400 mb-5">Yearly consultation count</p>

      <div className="overflow-x-auto">
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-full"
        >
          {/* Y-axis grid lines + labels */}
          {yTicks.map((tick) => {
            const y = padding.top + plotHeight - (tick / maxCount) * plotHeight
            return (
              <g key={`ytick-${tick}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-medium"
                >
                  {tick}
                </text>
              </g>
            )
          })}

          {/* Average line */}
          {avg > 0 && (
            <g>
              <line
                x1={padding.left}
                y1={padding.top + plotHeight - (avg / maxCount) * plotHeight}
                x2={width - padding.right}
                y2={padding.top + plotHeight - (avg / maxCount) * plotHeight}
                stroke="#94a3b8"
                strokeWidth={1.5}
                strokeDasharray="6 4"
              />
              <text
                x={width - padding.right - 4}
                y={padding.top + plotHeight - (avg / maxCount) * plotHeight - 4}
                textAnchor="end"
                className="fill-slate-400 text-[10px] font-medium"
              >
                Avg: {avg.toFixed(1)}
              </text>
            </g>
          )}

          {/* Area fill under the line */}
          {entries.length > 1 && (
            <polygon
              points={`${padding.left},${padding.top + plotHeight} ${points} ${padding.left + (entries.length - 1) * stepX},${padding.top + plotHeight}`}
              fill="url(#yearlyGradient)"
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="yearlyGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a047" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#d4a047" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Line */}
          {entries.length > 1 && (
            <polyline
              points={points}
              fill="none"
              stroke="#d4a047"
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Points + labels */}
          {entries.map((entry, i) => {
            const x = padding.left + i * stepX
            const y = padding.top + plotHeight - (entry.count / maxCount) * plotHeight
            return (
              <g key={entry.year}>
                {/* Value label */}
                <text
                  x={x}
                  y={y - 10}
                  textAnchor="middle"
                  className="fill-slate-600 text-[11px] font-semibold font-mono"
                >
                  {entry.count}
                </text>
                {/* Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  className="fill-white stroke-gold-500"
                  strokeWidth={2.5}
                />
                {/* X-axis label */}
                <text
                  x={x}
                  y={padding.top + plotHeight + 16}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-medium"
                >
                  {entry.year}
                </text>
              </g>
            )
          })}

          {/* Single point */}
          {entries.length === 1 && (
            <circle
              cx={padding.left}
              cy={padding.top + plotHeight - (entries[0].count / maxCount) * plotHeight}
              r={4}
              className="fill-white stroke-gold-500"
              strokeWidth={2.5}
            />
          )}
        </svg>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-[3px] rounded-full bg-gold-500" />
          <span className="text-xs text-slate-500">Consultations</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 inline-block border-t-2 border-dashed border-slate-400" />
          <span className="text-xs text-slate-500">Average</span>
        </div>
      </div>
    </div>
  )
}

// ─── Per-Faculty Monthly Table ────────────────

function FacultyFrequencyTable({ data, deanId }: { data: FacultyFrequencyData[]; deanId: string }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
        <p className="text-slate-400 text-sm">No faculty frequency data available for the selected period.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.total - a.total)
  const allMonths = Array.from(
    new Set(sorted.flatMap((f) => f.monthlyCounts.map((m) => m.month)))
  ).sort()
  const maxFacultyMonthCount = Math.max(
    ...sorted.flatMap((f) => f.monthlyCounts.map((m) => m.count)),
    1
  )

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Per-Faculty Frequency Breakdown</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg / Month
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Monthly Breakdown
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((faculty) => (
              <tr
                key={faculty.facultyId}
                className="transition-colors duration-150 hover:bg-slate-50/80"
              >
                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    {faculty.facultyName}
                    {faculty.facultyId === deanId && (
                      <span className="shrink-0 bg-gold-100 text-gold-800 rounded-full px-2 py-0.5 text-xs font-semibold">
                        Dean
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-slate-700 font-mono text-sm">
                  {faculty.total}
                </td>
                <td className="px-4 py-4 text-center text-slate-600 font-mono text-sm">
                  {faculty.averagePerMonth.toFixed(1)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 min-w-[200px]">
                    {allMonths.map((month) => {
                      const mc = faculty.monthlyCounts.find((m) => m.month === month)
                      const count = mc ? mc.count : 0
                      const barW = count > 0
                        ? Math.max(4, (count / maxFacultyMonthCount) * 24)
                        : 2

                      return (
                        <div
                          key={month}
                          className="h-4 rounded-sm flex-shrink-0 transition-all duration-200"
                          style={{
                            width: `${barW}px`,
                            backgroundColor: count > 0 ? "#d4a047" : "#e2e8f0",
                          }}
                          title={`${mc ? mc.monthName : month}: ${count}`}
                        />
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Per-Faculty Yearly Table ─────────────────

function FacultyYearlyTable({ data, deanId }: { data: FacultyYearlyData[]; deanId: string }) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-8 shadow-sm text-center">
        <p className="text-slate-400 text-sm">No faculty yearly frequency data available.</p>
      </div>
    )
  }

  const sorted = [...data].sort((a, b) => b.total - a.total)
  const allYears = Array.from(
    new Set(sorted.flatMap((f) => f.yearlyCounts.map((y) => y.year)))
  ).sort()
  const maxFacultyYearCount = Math.max(
    ...sorted.flatMap((f) => f.yearlyCounts.map((y) => y.count)),
    1
  )

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Per-Faculty Yearly Frequency Breakdown</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Faculty
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Total
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Avg / Year
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Yearly Breakdown
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((faculty) => (
              <tr
                key={faculty.facultyId}
                className="transition-colors duration-150 hover:bg-slate-50/80"
              >
                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">
                  <span className="flex items-center gap-2">
                    {faculty.facultyName}
                    {faculty.facultyId === deanId && (
                      <span className="shrink-0 bg-gold-100 text-gold-800 rounded-full px-2 py-0.5 text-xs font-semibold">
                        Dean
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-4 text-center text-slate-700 font-mono text-sm">
                  {faculty.total}
                </td>
                <td className="px-4 py-4 text-center text-slate-600 font-mono text-sm">
                  {faculty.averagePerYear.toFixed(1)}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-1.5 min-w-[200px]">
                    {allYears.map((year) => {
                      const yc = faculty.yearlyCounts.find((y) => y.year === year)
                      const count = yc ? yc.count : 0
                      const barW = count > 0
                        ? Math.max(4, (count / maxFacultyYearCount) * 32)
                        : 2

                      return (
                        <div
                          key={year}
                          className="h-4 rounded-sm flex-shrink-0 transition-all duration-200"
                          style={{
                            width: `${barW}px`,
                            backgroundColor: count > 0 ? "#d4a047" : "#e2e8f0",
                          }}
                          title={`${year}: ${count}`}
                        />
                      )
                    })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
