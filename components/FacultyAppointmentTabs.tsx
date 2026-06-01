"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const TABS = [
  { key: "all", label: "All", countKey: null },
  { key: "pending", label: "Pending", countKey: "pending" as const },
  { key: "approved", label: "Accepted", countKey: "approved" as const },
  { key: "completed", label: "Completed", countKey: "completed" as const },
  { key: "cancelled", label: "Cancelled", countKey: "cancelled" as const },
]

interface Props {
  counts: {
    pending: number
    approved: number
    completed: number
    cancelled: number
  }
  basePath?: string
}

export function FacultyAppointmentTabs({
  counts,
  basePath = "/faculty",
}: Props) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "all"

  const totalCount =
    counts.pending +
    counts.approved +
    counts.completed +
    counts.cancelled

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-200">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key

        const count =
          tab.countKey === null
            ? totalCount
            : counts[tab.countKey]

        const params = new URLSearchParams(searchParams.toString())
        if (tab.key === "all") {
          params.delete("tab")
        } else {
          params.set("tab", tab.key)
        }
        const qs = params.toString()
        const href = qs ? `${basePath}?${qs}` : basePath

        return (
          <Link
            key={tab.key}
            href={href}
            className={`
              flex items-center gap-1
              whitespace-nowrap border-b-2 px-3 sm:px-4 py-3 sm:py-2.5
              text-xs font-semibold transition-colors
              ${
                isActive
                  ? "border-gold-600 text-gold-700"
                  : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }
            `}
          >
            <span>{tab.label}</span>

            <span
              className={`
                rounded-full px-1.5 py-0.5 text-[10px] font-bold
                ${
                  isActive
                    ? "bg-gold-100 text-gold-700"
                    : "bg-slate-100 text-slate-500"
                }
              `}
            >
              {count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}