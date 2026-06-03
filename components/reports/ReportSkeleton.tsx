export function ReportSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
      {/* Header */}
      <div className="h-8 w-72 bg-slate-200 rounded-lg" />
      <div className="h-4 w-48 bg-slate-100 rounded" />

      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-end gap-4 p-5 bg-white rounded-2xl border border-slate-200/70 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-10 w-36 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-16 bg-slate-200 rounded" />
          <div className="h-10 w-36 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-12 bg-slate-200 rounded" />
          <div className="h-10 w-40 bg-slate-100 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-3 w-20 bg-slate-200 rounded" />
          <div className="h-10 w-44 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-10 w-28 bg-slate-200 rounded-lg" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-2xl border border-slate-200/70 shadow-sm space-y-2">
            <div className="h-3 w-24 bg-slate-200 rounded" />
            <div className="h-8 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>

      {/* Chart skeleton */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200/70 shadow-sm space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        <div className="h-48 bg-slate-100 rounded-lg" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <div className="h-5 w-36 bg-slate-200 rounded" />
        </div>
        <div className="p-6 space-y-3">
          <div className="flex gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-4 flex-1 bg-slate-100 rounded" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              {[...Array(6)].map((_, j) => (
                <div key={j} className="h-4 flex-1 bg-slate-50 rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
