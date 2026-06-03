"use client"

import type { BacklogEntry } from "@/lib/types"

interface BacklogAgingTableProps {
  entries: BacklogEntry[]
}

export function BacklogAgingTable({ entries }: BacklogAgingTableProps) {
  const bucketOrder = ["0 - 3 Days", "4 - 7 Days", "8 - 14 Days", "More Than 14 Days"]

  const grouped = bucketOrder.map((label) => ({
    label,
    entries: entries.filter((e) => e.agingBucket === label),
  }))

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-800 mb-4">Aging Table</h3>
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">
          No unresolved consultations
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">Aging Table</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Aging Bucket</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Faculty</th>
              <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Student</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
              <th className="text-center px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {grouped.map((group) => {
              const bucketColor =
                group.label === "0 - 3 Days" ? "bg-emerald-50" :
                group.label === "4 - 7 Days" ? "bg-amber-50" :
                group.label === "8 - 14 Days" ? "bg-orange-50" :
                "bg-red-50"

              const bucketBadge =
                group.label === "0 - 3 Days" ? "bg-emerald-100 text-emerald-700" :
                group.label === "4 - 7 Days" ? "bg-amber-100 text-amber-700" :
                group.label === "8 - 14 Days" ? "bg-orange-100 text-orange-700" :
                "bg-red-100 text-red-700"

              if (group.entries.length === 0) {
                return (
                  <tr key={group.label} className={`${bucketColor} border-b border-slate-100`}>
                    <td className="px-4 py-3" colSpan={6}>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bucketBadge}`}>
                        {group.label}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">No entries</span>
                    </td>
                  </tr>
                )
              }

              return group.entries.map((entry, idx) => (
                <tr key={entry.id} className={`${idx === 0 ? bucketColor : ""} transition-colors duration-150 hover:bg-slate-50`}>
                  <td className="px-4 py-3">
                    {idx === 0 && (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${bucketBadge}`}>
                        {group.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{entry.facultyName}</td>
                  <td className="px-4 py-3 text-slate-600">{entry.studentName}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs text-slate-500">{entry.date}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={entry.status} />
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-sm font-semibold text-slate-700">
                    {entry.ageDays}d
                  </td>
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        Pending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
      Approved
    </span>
  )
}
