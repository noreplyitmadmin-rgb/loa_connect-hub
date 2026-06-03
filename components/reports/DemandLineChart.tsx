"use client"

interface DataPoint {
  label: string
  count: number
}

interface DemandLineChartProps {
  data: DataPoint[]
  title: string
}

export function DemandLineChart({ data, title }: DemandLineChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const width = 700
  const height = 250
  const padding = { top: 20, right: 20, bottom: 40, left: 40 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW
  const yScale = (v: number) => padding.top + chartH - (v / maxCount) * chartH

  const linePath = data
    .map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.count)}`)
    .join(" ")

  const areaPath = `${linePath} L${xScale(data.length - 1)},${padding.top + chartH} L${xScale(0)},${padding.top + chartH} Z`

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{data.length} data points</p>

      <div className="overflow-x-auto">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="min-w-[700px]">
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = yScale(maxCount * pct)
            return (
              <g key={pct}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#f1f5f9" strokeWidth={1} />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" className="text-[10px]" fill="#94a3b8">
                  {Math.round(maxCount * pct)}
                </text>
              </g>
            )
          })}

          {/* Area fill */}
          <path d={areaPath} fill="url(#gradient)" opacity={0.15} />

          {/* Line */}
          <path d={linePath} fill="none" stroke="#d4a04a" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

          {/* Dots */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={xScale(i)}
              cy={yScale(d.count)}
              r={3.5}
              fill="#d4a04a"
              stroke="white"
              strokeWidth={2}
              className="transition-all duration-200 hover:r-5"
            >
              <title>{d.label}: {d.count}</title>
            </circle>
          ))}

          {/* X-axis labels (show every N to avoid crowding) */}
          {data.map((d, i) => {
            const skip = Math.max(1, Math.floor(data.length / 12))
            if (i % skip !== 0 && i !== data.length - 1) return null
            return (
              <text
                key={i}
                x={xScale(i)}
                y={height - 8}
                textAnchor="middle"
                className="text-[9px]"
                fill="#94a3b8"
              >
                {d.label}
              </text>
            )
          })}

          <defs>
            <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a04a" />
              <stop offset="100%" stopColor="#d4a04a" stopOpacity={0} />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
}
