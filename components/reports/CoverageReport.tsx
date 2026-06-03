"use client"

import { useMemo, useCallback } from "react"
import type { CoverageData, CoverageTrendEntry } from "@/lib/types"

interface CoverageReportProps {
  overall: CoverageData
  byDepartment: (CoverageData & { departmentId: string; departmentName: string })[]
  trend: CoverageTrendEntry[]
  departmentName: string
}

const size = 200
const cx = size / 2
const cy = size / 2
const radius = 80
const strokeWidth = 30

function CoverageDonut({ withConsultations, withoutConsultations }: { withConsultations: number; withoutConsultations: number }) {
  const total = withConsultations + withoutConsultations

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No data available
      </div>
    )
  }

  const segments = [
    { label: "With Consultations", value: withConsultations, color: "#34d399" },
    { label: "Without Consultations", value: withoutConsultations, color: "#94a3b8" },
  ].filter((s) => s.value > 0)

  let cumulativePercent = 0
  const arcs = segments.map((segment) => {
    const percent = segment.value / total
    const startPercent = cumulativePercent
    const endPercent = cumulativePercent + percent
    cumulativePercent = endPercent

    const startAngle = startPercent * 360 - 90
    const endAngle = endPercent * 360 - 90

    const startRad = (startAngle * Math.PI) / 180
    const endRad = (endAngle * Math.PI) / 180

    const x1 = cx + radius * Math.cos(startRad)
    const y1 = cy + radius * Math.sin(startRad)
    const x2 = cx + radius * Math.cos(endRad)
    const y2 = cy + radius * Math.sin(endRad)

    const largeArc = percent > 0.5 ? 1 : 0

    const path = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`

    return { ...segment, percent, path }
  })

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        {arcs.map((seg) => (
          <path
            key={seg.label}
            d={seg.path}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out hover:opacity-80"
          />
        ))}
      </svg>

      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        {arcs.map((seg) => (
          <div key={seg.label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: seg.color }} />
            <span className="text-xs text-slate-500">
              {seg.label} ({Math.round(seg.percent * 100)}%)
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 w-full max-w-xs">
        {segments.map((seg) => (
          <div key={seg.label} className="text-center">
            <p className="text-lg font-bold text-slate-800">{seg.value}</p>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
              {seg.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function CoverageTrendChart({ trend }: { trend: CoverageTrendEntry[] }) {
  if (trend.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        No trend data available
      </div>
    )
  }

  const maxCoverage = Math.max(...trend.map((t) => t.coveragePercentage), 1)
  const maxConsulted = Math.max(...trend.map((t) => t.studentsWithConsultations), 1)
  const width = 700
  const height = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const xScale = (i: number) => padding.left + (i / Math.max(trend.length - 1, 1)) * chartW
  const yScaleCoverage = (v: number) => padding.top + chartH - (v / maxCoverage) * chartH
  const yScaleConsulted = (v: number) => padding.top + chartH - (v / maxConsulted) * chartH

  const coveragePath = trend
    .map((t, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScaleCoverage(t.coveragePercentage)}`)
    .join(" ")

  const consultedPath = trend
    .map((t, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScaleConsulted(t.studentsWithConsultations)}`)
    .join(" ")

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-[700px]">
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const y = yScaleCoverage(maxCoverage * pct)
          return (
            <g key={pct}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">
                {Math.round(maxCoverage * pct)}%
              </text>
            </g>
          )
        })}

        <path d={coveragePath} fill="none" stroke="#34d399" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={consultedPath} fill="none" stroke="#d4a04a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="6 3" />

        {trend.map((t, i) => (
          <g key={i}>
            <circle
              cx={xScale(i)}
              cy={yScaleCoverage(t.coveragePercentage)}
              r={3.5}
              fill="#34d399"
              stroke="white"
              strokeWidth={2}
            >
              <title>Coverage: {t.coveragePercentage}%</title>
            </circle>
            <circle
              cx={xScale(i)}
              cy={yScaleConsulted(t.studentsWithConsultations)}
              r={3.5}
              fill="#d4a04a"
              stroke="white"
              strokeWidth={2}
            >
              <title>Students: {t.studentsWithConsultations}</title>
            </circle>
          </g>
        ))}

        {trend.map((t, i) => {
          const skip = Math.max(1, Math.floor(trend.length / 12))
          if (i % skip !== 0 && i !== trend.length - 1) return null
          return (
            <text
              key={i}
              x={xScale(i)}
              y={height - 8}
              textAnchor="middle"
              className="text-[9px]"
              fill="#94a3b8"
            >
              {t.monthName.slice(0, 3)} {t.year}
            </text>
          )
        })}
      </svg>
    </div>
  )
}

export function CoverageReport({ overall, byDepartment, trend, departmentName }: CoverageReportProps) {
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
      ["Consultation Coverage Report"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Students", String(overall.totalStudents)],
      ["Students with Consultations", String(overall.studentsWithConsultations)],
      ["Students without Consultations", String(overall.studentsWithoutConsultations)],
      ["Coverage Percentage", `${overall.coveragePercentage}%`],
      [],
      ["Department", "Total Students", "With Consultations", "Without Consultations", "Coverage %"],
      ...byDepartment.map((d) => [
        esc(d.departmentName),
        String(d.totalStudents),
        String(d.studentsWithConsultations),
        String(d.studentsWithoutConsultations),
        `${d.coveragePercentage}%`,
      ]),
    ]

    if (trend.length > 0) {
      rows.push([], ["Monthly Trend"], ["Month", "Year", "Total Students", "Students with Consultations", "Coverage %"])
      for (const t of trend) {
        rows.push([t.monthName, String(t.year), String(t.totalStudents), String(t.studentsWithConsultations), `${t.coveragePercentage}%`])
      }
    }

    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Coverage_Report_${dateStr}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [overall, byDepartment, trend, departmentName, esc])

  const exportExcel = useCallback(() => {
    const dateStr = new Date().toISOString().slice(0, 10)
    const rows: string[][] = [
      ["Consultation Coverage Report"],
      [`Department: ${departmentName}`],
      [],
      ["Metric", "Value"],
      ["Total Students", String(overall.totalStudents)],
      ["Students with Consultations", String(overall.studentsWithConsultations)],
      ["Students without Consultations", String(overall.studentsWithoutConsultations)],
      ["Coverage Percentage", `${overall.coveragePercentage}%`],
      [],
      ["Department", "Total Students", "With Consultations", "Without Consultations", "Coverage %"],
      ...byDepartment.map((d) => [
        esc(d.departmentName),
        String(d.totalStudents),
        String(d.studentsWithConsultations),
        String(d.studentsWithoutConsultations),
        `${d.coveragePercentage}%`,
      ]),
    ]

    if (trend.length > 0) {
      rows.push([], ["Monthly Trend"], ["Month", "Year", "Total Students", "Students with Consultations", "Coverage %"])
      for (const t of trend) {
        rows.push([t.monthName, String(t.year), String(t.totalStudents), String(t.studentsWithConsultations), `${t.coveragePercentage}%`])
      }
    }

    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csv], { type: "application/vnd.ms-excel;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `Coverage_Report_${dateStr}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [overall, byDepartment, trend, departmentName, esc])

  const sortedDepts = useMemo(
    () => [...byDepartment].sort((a, b) => b.coveragePercentage - a.coveragePercentage),
    [byDepartment]
  )

  const hasData = overall.totalStudents > 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Consultation Coverage Report</h1>
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <SummaryCard label="Total Students" value={overall.totalStudents} color="blue" />
        <SummaryCard label="With Consultations" value={overall.studentsWithConsultations} color="green" />
        <SummaryCard label="Without Consultations" value={overall.studentsWithoutConsultations} color="amber" />
        <SummaryCard label="Coverage" value={`${overall.coveragePercentage}%`} color="purple" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Student Coverage Distribution</h3>
          <p className="text-xs text-slate-400 mb-5">{overall.totalStudents} total students</p>
          {hasData ? (
            <CoverageDonut
              withConsultations={overall.studentsWithConsultations}
              withoutConsultations={overall.studentsWithoutConsultations}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No data available
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
          <h3 className="text-sm font-bold text-slate-800 mb-1">Coverage Trend</h3>
          <p className="text-xs text-slate-400 mb-4">Cumulative students with consultations over time</p>
          {trend.length > 0 ? (
            <>
              <CoverageTrendChart trend={trend} />
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs text-slate-500">Coverage %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-gold-400 border-0" style={{ borderTop: "2.5px dashed #d4a04a", width: 16, height: 0 }} />
                  <span className="text-xs text-slate-500">Students with Consultations</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Department Breakdown Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Department Coverage Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Department</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total Students</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-emerald-600">With Consultations</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-amber-600">Without</th>
                <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Coverage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedDepts.map((dept) => (
                <tr key={dept.departmentId} className="transition-colors duration-150 hover:bg-slate-50">
                  <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">{dept.departmentName}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-slate-700">{dept.totalStudents}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-emerald-600">{dept.studentsWithConsultations}</td>
                  <td className="px-4 py-4 text-center font-mono text-sm text-amber-600">{dept.studentsWithoutConsultations}</td>
                  <td className="px-4 py-4 text-center">
                    <CoverageBadge rate={dept.coveragePercentage} />
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

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: "blue" | "green" | "amber" | "purple" }) {
  const colorClasses = {
    blue: "from-blue-50 to-blue-100/50 border-blue-200/60 text-blue-700",
    green: "from-emerald-50 to-emerald-100/50 border-emerald-200/60 text-emerald-700",
    amber: "from-amber-50 to-amber-100/50 border-amber-200/60 text-amber-700",
    purple: "from-purple-50 to-purple-100/50 border-purple-200/60 text-purple-700",
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

function CoverageBadge({ rate }: { rate: number }) {
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
