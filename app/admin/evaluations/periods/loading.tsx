export default function Loading() {
  return (
    <div className="w-full space-y-6 pb-12">
      <div>
        <div className="h-7 w-32 bg-surface-dim rounded animate-pulse-soft" />
        <div className="h-4 w-48 bg-surface-dim rounded animate-pulse-soft mt-1" />
      </div>
      <div className="rounded-xl border border-default bg-surface p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface-dim rounded animate-pulse-soft" />
        ))}
      </div>
    </div>
  )
}
