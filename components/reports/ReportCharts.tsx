"use client"

import type { FacultyStatsData } from "@/lib/types"

interface ReportChartsProps {
  stats: FacultyStatsData[]
}

export function ReportCharts({ stats }: ReportChartsProps) {
  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">
          Department-wide Status Breakdown
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  return <DonutChartCard stats={stats} />
}

// ─── Donut Chart ─────────────────────────────

function DonutChartCard({ stats }: { stats: FacultyStatsData[] }) {
  const totalCompleted = stats.reduce((sum, s) => sum + s.completed, 0)
  const totalPending = stats.reduce((sum, s) => sum + s.pending, 0)
  const totalCancelled = stats.reduce((sum, s) => sum + s.cancelled, 0)
  const total = totalCompleted + totalPending + totalCancelled

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">
          Department-wide Status Breakdown
        </h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  const segments = [
    { label: "Completed", value: totalCompleted, color: "#34d399" },   // emerald-400
    { label: "Pending", value: totalPending, color: "#fbbf24" },       // amber-400
    { label: "Cancelled", value: totalCancelled, color: "#94a3b8" },   // slate-400
  ].filter((s) => s.value > 0)

  const size = 180
  const cx = size / 2
  const cy = size / 2
  const radius = 72
  const strokeWidth = 28

  // Calculate arc paths
  let cumulativePercent = 0
  const arcs: ({ label: string; value: number; color: string; percent: number; path: string })[] = segments.map((segment) => {
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
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 pt-8 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">
        Department-wide Status Breakdown
      </h3>
      <p className="text-xs text-slate-400 mb-5">{total} total consultations</p>

      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          {/* Background circle */}
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />

          {/* Segments */}
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

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          {arcs.map((seg) => (
            <div key={seg.label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <span className="text-xs text-slate-500">
                {seg.label} ({Math.round(seg.percent * 100)}%)
              </span>
            </div>
          ))}
        </div>

        {/* Segment counts */}
        <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xs">
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
    </div>
  )
}
