import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton"

export default function StudentDashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <Skeleton variant="metric" />
        <Skeleton variant="metric" />
      </div>

      {/* Quick Book CTA */}
      <div className="card p-6 bg-surface flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="w-64" />
          <Skeleton variant="text" className="w-48" />
        </div>
        <Skeleton variant="badge" className="w-36 h-9 !rounded-lg" />
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton variant="text" className="w-48 h-7" />
          <div className="flex gap-1">
            <Skeleton variant="badge" className="w-16 h-7 !rounded-md" />
            <Skeleton variant="badge" className="w-16 h-7 !rounded-md" />
            <Skeleton variant="badge" className="w-16 h-7 !rounded-md" />
          </div>
        </div>
        <SkeletonCard count={3} />
      </div>
    </div>
  )
}
