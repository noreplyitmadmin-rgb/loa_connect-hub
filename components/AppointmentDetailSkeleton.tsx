export default function AppointmentDetailSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse-soft">
      {/* Card 1: Main info */}
      <div className="card p-6 bg-white mb-6">
        {/* Header row */}
        <div className="flex items-center justify-between mb-6">
          <div className="h-7 w-1/2 bg-slate-200 rounded" />
          <div className="h-6 w-20 bg-slate-200 rounded-full" />
        </div>

        {/* Organizer line */}
        <div className="h-4 w-1/3 bg-slate-200 rounded mb-4" />

        {/* Time slots section */}
        <div className="mb-6 space-y-2">
          <div className="h-3 w-24 bg-slate-200 rounded uppercase" />
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
            <div className="h-5 w-32 bg-slate-200 rounded" />
            <div className="h-6 w-16 bg-slate-200 rounded-full" />
          </div>
        </div>

        {/* People grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-200 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
            <div className="space-y-2 flex-1">
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-5 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-36 bg-slate-200 rounded" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
          <div className="h-4 w-full bg-slate-200 rounded" />
          <div className="h-4 w-3/4 bg-slate-200 rounded" />
          <div className="h-4 w-1/2 bg-slate-200 rounded" />
        </div>

        {/* Timestamps */}
        <div className="space-y-1">
          <div className="h-3 w-64 bg-slate-200 rounded" />
          <div className="h-3 w-64 bg-slate-200 rounded" />
        </div>
      </div>

      {/* Card 2: Participants */}
      <div className="card p-6 bg-white">
        <div className="h-4 w-40 bg-slate-200 rounded uppercase mb-4" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="space-y-1">
                  <div className="h-4 w-24 bg-slate-200 rounded" />
                  <div className="h-3 w-32 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="h-5 w-20 bg-slate-200 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Card 3: Actions */}
      <div className="card p-5 bg-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-2">
            <div className="h-9 w-28 bg-slate-200 rounded-lg" />
            <div className="h-9 w-28 bg-slate-200 rounded-lg" />
          </div>
          <div className="h-9 w-20 bg-slate-200 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
