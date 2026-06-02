"use client"

interface StatusDistributionChartProps {
  completed: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
}

const COLORS = {
  completed: "#34d399",
  pending: "#fbbf24",
  approved: "#60a5fa",
  rejected: "#f87171",
  cancelled: "#94a3b8",
} as const

const STATUS_LABELS: Record<string, string> = {
  completed: "Completed",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
}

export function StatusDistributionChart({
  completed,
  pending,
  approved,
  rejected,
  cancelled,
}: StatusDistributionChartProps) {
  const segments = [
    { key: "completed", value: completed },
    { key: "pending", value: pending },
    { key: "approved", value: approved },
    { key: "rejected", value: rejected },
    { key: "cancelled", value: cancelled },
  ].filter((s) => s.value > 0)

  const total = segments.reduce((sum, s) => sum + s.value, 0)

  const size = 200
  const cx = size / 2
  const cy = size / 2
  const radius = 80
  const strokeWidth = 30

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

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Status Distribution</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Status Distribution</h3>
      <p className="text-xs text-slate-400 mb-5">{total} total consultations</p>

      <div className="flex flex-col items-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-sm">
          <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
          {arcs.map((seg) => (
            <path
              key={seg.key}
              d={seg.path}
              fill="none"
              stroke={COLORS[seg.key as keyof typeof COLORS]}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out hover:opacity-80"
            />
          ))}
        </svg>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
          {arcs.map((seg) => (
            <div key={seg.key} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[seg.key as keyof typeof COLORS] }}
              />
              <span className="text-xs text-slate-500">
                {STATUS_LABELS[seg.key]} ({Math.round(seg.percent * 100)}%)
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-5 gap-3 mt-4 w-full max-w-md">
          {arcs.map((seg) => (
            <div key={seg.key} className="text-center">
              <p className="text-lg font-bold text-slate-800">{seg.value}</p>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                {STATUS_LABELS[seg.key]}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
