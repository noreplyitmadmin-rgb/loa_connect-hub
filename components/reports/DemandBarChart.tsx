"use client"

interface DataPoint {
  label: string
  count: number
}

interface DemandBarChartProps {
  data: DataPoint[]
  title: string
}

export function DemandBarChart({ data, title }: DemandBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No data available</div>
      </div>
    )
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1)
  const barHeight = 200
  const showLabels = data.length <= 31

  const sorted = [...data]

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">{title}</h3>
      <p className="text-xs text-slate-400 mb-4">{data.length} data points</p>

      <div className="overflow-x-auto">
        <div className="flex items-end gap-1.5" style={{ height: barHeight, minWidth: Math.max(data.length * 24, 400) }}>
          {sorted.map((d, i) => {
            const h = (d.count / maxCount) * (barHeight - 20)
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group min-w-[16px]">
                <div
                  className="w-full rounded-t-sm bg-gradient-to-t from-gold-600 to-gold-400 transition-all duration-200 group-hover:opacity-80"
                  style={{ height: `${h}px` }}
                  title={`${d.label}: ${d.count}`}
                />
                {showLabels && (
                  <span className="text-[8px] text-slate-400 text-center truncate w-full leading-tight">
                    {d.label}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
