"use client"

import type { FacultyStatsData } from "@/lib/types"
import { usePagination, Paginator } from "@/components/ui/Paginator"

interface ReportTableProps {
  stats: FacultyStatsData[]
}

export function ReportTable({ stats }: ReportTableProps) {
  const sorted = [...stats].sort((a, b) => b.total - a.total)
  const { page, totalPages, pageSize, paginatedItems, setPage, setPageSize } = usePagination(sorted, 25)

  if (stats.length === 0) {
    return (
      <div className="rounded-2xl border border-default/70 bg-surface p-8 shadow-sm text-center">
        <p className="text-tertiary text-sm">No faculty data available for this department.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-default/70 bg-surface shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md">
      <div className="px-6 py-4 border-b border-default">
        <h3 className="text-sm font-bold text-primary">Faculty Consultation Summary</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-default bg-surface/50">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Faculty
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Total
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Completed
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Pending
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Cancelled
              </th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-tertiary">
                Completion Rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedItems.map((stat) => (
              <tr
                key={stat.facultyId}
                className="transition-colors duration-150 hover:bg-surface-hover/80"
              >
                <td className="px-6 py-4 font-medium text-primary whitespace-nowrap">
                  {stat.facultyName}
                </td>
                <td className="px-4 py-4 text-center text-secondary font-mono text-sm">
                  {stat.total}
                </td>
                <td className="px-4 py-4 text-center text-emerald-600 font-mono text-sm">
                  {stat.completed}
                </td>
                <td className="px-4 py-4 text-center text-amber-600 font-mono text-sm">
                  {stat.pending}
                </td>
                <td className="px-4 py-4 text-center text-tertiary font-mono text-sm">
                  {stat.cancelled}
                </td>
                <td className="px-4 py-4 text-center">
                  <CompletionBadge rate={stat.completionRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Paginator {...{ page, totalPages, pageSize, setPage, setPageSize }} totalItems={stats.length} />
    </div>
  )
}

function CompletionBadge({ rate }: { rate: number }) {
  let bg: string
  let text: string
  let dot: string

  if (rate >= 80) {
    bg = "bg-emerald-100"
    text = "text-emerald-800"
    dot = "bg-emerald-500"
  } else if (rate >= 50) {
    bg = "bg-amber-100"
    text = "text-amber-800"
    dot = "bg-amber-500"
  } else {
    bg = "bg-red-100"
    text = "text-red-800"
    dot = "bg-red-500"
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${bg} ${text} transition-all duration-200`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {rate}%
    </span>
  )
}
