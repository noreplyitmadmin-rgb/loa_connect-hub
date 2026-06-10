import { SkeletonMetricGrid, SkeletonTable } from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div className="pb-12 animate-pulse">
      <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-default z-20">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <div className="space-y-1.5">
            <div className="h-5 w-48 bg-surface-tertiary rounded" />
            <div className="h-3 w-32 bg-surface-tertiary rounded" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-9 w-40 bg-surface-tertiary rounded-lg" />
            <div className="h-9 w-28 bg-surface-tertiary rounded-lg" />
          </div>
        </div>
      </div>
      <div className="max-w-[1400px] mx-auto px-6 pt-6 space-y-6">
        <SkeletonMetricGrid count={4} />
        <div className="bg-surface rounded-xl border border-default p-4">
          <SkeletonTable rows={7} cols={11} />
        </div>
      </div>
    </div>
  )
}
