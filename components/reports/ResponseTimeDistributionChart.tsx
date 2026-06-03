"use client"

import type { ResponseTimeDistribution } from "@/lib/types"

interface ResponseTimeDistributionChartProps {
  distribution: ResponseTimeDistribution[]
}

export function ResponseTimeDistributionChart({ distribution }: ResponseTimeDistributionChartProps) {
  const maxCount = Math.max(...distribution.map((d) => d.count), 1)

  if (distribution.length === 0 || distribution.every((d) => d.count === 0)) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Response Time Distribution</h3>
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
          No data available
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md">
      <h3 className="text-sm font-bold text-slate-800 mb-1">Response Time Distribution</h3>
      <p className="text-xs text-slate-400 mb-5">How quickly consultations are responded to</p>

      <div className="space-y-3">
        {distribution.map((bucket) => {
          const pct = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0
          return (
            <div key={bucket.label}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">{bucket.label}</span>
                <span className="font-mono text-slate-500 ml-2">{bucket.count}</span>
              </div>
              <div className="w-full h-5 bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-gold-400 to-gold-600 transition-all duration-500"
                  style={{ width: `${Math.max(pct, bucket.count > 0 ? 3 : 0)}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
