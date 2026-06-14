import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton"

export default function StudentMeetingsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton variant="text" className="w-32 h-8" />
        <Skeleton variant="badge" className="w-20" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-0.5">
        <Skeleton variant="badge" className="w-14 h-8 !rounded-none !rounded-t-md" />
        <Skeleton variant="badge" className="w-20 h-8 !rounded-none !rounded-t-md" />
        <Skeleton variant="badge" className="w-20 h-8 !rounded-none !rounded-t-md" />
        <Skeleton variant="badge" className="w-24 h-8 !rounded-none !rounded-t-md" />
        <Skeleton variant="badge" className="w-24 h-8 !rounded-none !rounded-t-md" />
      </div>

      {/* Appointment cards */}
      <SkeletonCard count={3} />
    </div>
  )
}
