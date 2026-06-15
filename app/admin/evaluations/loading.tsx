export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <div className="h-7 w-32 bg-surface-dim rounded animate-pulse-soft" />
        <div className="h-4 w-48 bg-surface-dim rounded animate-pulse-soft mt-1" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-default bg-surface p-6 space-y-2">
            <div className="h-4 w-28 bg-surface-dim rounded animate-pulse-soft" />
            <div className="h-3 w-40 bg-surface-dim rounded animate-pulse-soft" />
          </div>
        ))}
      </div>
    </div>
  )
}
