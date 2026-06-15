export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto pb-12 space-y-8">
      <div className="h-8 w-32 bg-surface-dim rounded animate-pulse-soft" />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-default bg-surface p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-5 w-5 bg-surface-dim rounded animate-pulse-soft" />
              <div className="h-7 w-12 bg-surface-dim rounded animate-pulse-soft" />
            </div>
            <div className="h-4 w-24 bg-surface-dim rounded animate-pulse-soft" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-default bg-surface p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-28 bg-surface-dim rounded animate-pulse-soft" />
            <div className="h-3 w-20 bg-surface-dim rounded animate-pulse-soft" />
          </div>
          <div className="h-2.5 rounded-full bg-surface-dim animate-pulse-soft" />
        </div>
        <div className="lg:col-span-2 rounded-2xl border border-default bg-surface p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-24 bg-surface-dim rounded animate-pulse-soft" />
            <div className="h-3 w-16 bg-surface-dim rounded animate-pulse-soft" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-3 w-12 bg-surface-dim rounded animate-pulse-soft" />
                <div className="h-3 w-20 bg-surface-dim rounded animate-pulse-soft" />
                <div className="h-3 flex-1 bg-surface-dim rounded animate-pulse-soft" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
