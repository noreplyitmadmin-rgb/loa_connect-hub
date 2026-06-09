"use client"

type SkeletonVariant = "text" | "card" | "table-row" | "avatar" | "metric" | "badge"

interface SkeletonProps {
  variant?: SkeletonVariant
  className?: string
  count?: number
}

const baseClass = "animate-pulse-soft bg-slate-200 rounded"

const variants: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded",
  card: "h-32 w-full rounded-xl",
  "table-row": "h-12 w-full rounded",
  avatar: "h-10 w-10 rounded-full",
  metric: "h-24 w-full rounded-xl",
  badge: "h-6 w-16 rounded-full",
}

export default function Skeleton({ variant = "text", className = "", count = 1 }: SkeletonProps) {
  const v = variants[variant]
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`${baseClass} ${v} ${className}`}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" className={`flex-1 ${c === 0 ? "w-1/4" : ""}`} />
          ))}
        </div>
      ))}
    </div>
  )
}

export function SkeletonMetricGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="metric" />
      ))}
    </div>
  )
}

export function SkeletonCard({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton variant="avatar" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" className="w-1/3" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </div>
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-3/4" />
          <div className="flex gap-2 pt-2">
            <Skeleton variant="badge" />
            <Skeleton variant="badge" />
          </div>
        </div>
      ))}
    </div>
  )
}
