"use client"

interface FacultyBucket {
  facultyName: string
  buckets: { label: string; count: number }[]
}

interface BacklogStackedBarChartProps {
  byFaculty: FacultyBucket[]
}

const BUCKET_COLORS: Record<string, string> = {
  "0 - 3 Days": "#34d399",
  "4 - 7 Days": "#fbbf24",
  "8 - 14 Days": "#fb923c",
  "More Than 14 Days": "#f87171",
}

const BUCKET_ORDER = ["0 - 3 Days", "4 - 7 Days", "8 - 14 Days", "More Than 14 Days"]

export function BacklogStackedBarChart({ byFaculty }: BacklogStackedBarChartProps) {
  const totalAll = byFaculty.reduce((s, f) => s + f.buckets.reduce((bs, b) => bs + b.count, 0), 0)

  if (byFaculty.length === 0 || totalAll === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Backlog by Faculty</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No backlog data
        </div>
      </div>
    )
  }

  const maxTotal = Math.max(...byFaculty.map((f) => f.buckets.reduce((s, b) => s + b.count, 0)), 1)

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Backlog by Faculty</h3>
      <p className="text-xs text-slate-400 mb-5">{totalAll} unresolved consultations</p>

      <div className="space-y-4">
        {byFaculty.map((faculty) => {
          const total = faculty.buckets.reduce((s, b) => s + b.count, 0)
          return (
            <div key={faculty.facultyName}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 truncate">{faculty.facultyName}</span>
                <span className="font-mono text-slate-500 ml-2">{total}</span>
              </div>
              <div className="flex h-5 bg-slate-100 rounded-full overflow-hidden">
                {BUCKET_ORDER.map((label) => {
                  const bucket = faculty.buckets.find((b) => b.label === label)
                  const count = bucket?.count || 0
                  const pct = maxTotal > 0 ? (count / maxTotal) * 100 : 0
                  if (count === 0) return null
                  return (
                    <div
                      key={label}
                      className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: BUCKET_COLORS[label],
                        minWidth: count > 0 ? "4px" : undefined,
                      }}
                      title={`${label}: ${count}`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-slate-100">
        {BUCKET_ORDER.map((label) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: BUCKET_COLORS[label] }} />
            <span className="text-xs text-slate-500">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
