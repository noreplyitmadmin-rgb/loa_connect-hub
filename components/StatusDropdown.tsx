"use client"

import { useRouter } from "next/navigation"

const statusLabels: Record<string, string> = {
  all: "All Statuses",
  PENDING: "Invited",
  APPROVED: "Accepted",
  REJECTED: "Rejected",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
}

export default function StatusDropdown({
  activeFilter,
  activeSort,
  activeStatus,
  query,
}: {
  activeFilter: string
  activeSort: string
  activeStatus: string
  query: string
}) {
  const router = useRouter()

  return (
    <form className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <input type="hidden" name="filter" value={activeFilter} />
      <input type="hidden" name="sort" value={activeSort} />
      <input type="hidden" name="q" value={query} />
      <label className="w-full sm:w-auto">
        <span className="block text-xs font-semibold text-slate-500 mb-2">Status</span>
        <select
          name="status"
          value={activeStatus}
          onChange={(event) => {
            const status = event.target.value
            const params = new URLSearchParams({
              filter: activeFilter,
              sort: activeSort,
              status,
            })
            if (query) params.set("q", query)
            router.push(`/faculty/meetings?${params.toString()}`)
          }}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-slate-400 focus:outline-none"
        >
          {Object.entries(statusLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </label>
    </form>
  )
}
