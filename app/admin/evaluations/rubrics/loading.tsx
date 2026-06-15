import Skeleton from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div>
        <div className="h-7 w-48 bg-surface-dim rounded animate-pulse-soft" />
        <div className="h-4 w-64 bg-surface-dim rounded animate-pulse-soft mt-2" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-surface border border-default overflow-hidden">
            <div className="px-4 py-3 border-b border-default">
              <Skeleton variant="text" className="w-1/3" />
            </div>
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} variant="text" className="w-3/4" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
