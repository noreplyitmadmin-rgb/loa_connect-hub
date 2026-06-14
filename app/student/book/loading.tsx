import Skeleton from "@/components/ui/Skeleton"

export default function StudentBookLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton variant="text" className="w-48 h-8" />
        <Skeleton variant="text" className="w-72" />
      </div>

      {/* Booking widget placeholder */}
      <Skeleton variant="card" className="h-96" />
      <Skeleton variant="card" className="h-64" />
    </div>
  )
}
