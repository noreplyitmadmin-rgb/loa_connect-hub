export default function Loading() {
  return (
    <div className="p-6 space-y-4">
      <div className="h-8 w-48 bg-surface-dim rounded animate-pulse-soft" />
      <div className="h-4 w-64 bg-surface-dim rounded animate-pulse-soft" />
      <div className="space-y-3 mt-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 bg-surface-dim rounded-xl animate-pulse-soft" />
        ))}
      </div>
    </div>
  )
}
