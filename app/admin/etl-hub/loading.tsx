"use client"

import Skeleton, {
  SkeletonMetricGrid
} from "@/components/ui/Skeleton"

export default function Loading() {
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Title area */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-primary">
          ETL Hub
        </h1>
        <p className="text-sm text-tertiary mt-1">
          <Skeleton variant="text" className="w-96" />
        </p>
      </div>

      {/* Bulk Import */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-primary">
          Bulk Import
        </h3>
        <p className="text-sm text-tertiary mt-1">
          <Skeleton variant="text" className="w-64" />
        </p>
        <div className="mt-4 mb-4 flex items-center gap-3">
          <label className="text-xs font-semibold text-secondary shrink-0">
            Department
          </label>
          <Skeleton variant="text" className="w-48" />
        </div>
      </div>

      {/* ViewMappings */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold text-primary">
            Data Preview
          </h3>
          <Skeleton variant="badge" className="w-20 h-6" />
        </div>
        <SkeletonMetricGrid count={4} />
        <div className="flex gap-1 mb-4 border-b border-default">
          <Skeleton variant="badge" className="h-6 w-32" />
          <Skeleton variant="badge" className="h-6 w-32" />
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto border border-default rounded-xl">
          <div className="w-full">
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-2">
                  <Skeleton variant="text" className="flex-1" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reset Data */}
      <div className="card p-6 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
          Reset Data
        </h3>
        <p className="text-sm text-tertiary mt-1">
          <Skeleton variant="text" className="w-96" />
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Skeleton variant="badge" className="w-48 h-8" />
        </div>
      </div>
    </div>
  )
}
