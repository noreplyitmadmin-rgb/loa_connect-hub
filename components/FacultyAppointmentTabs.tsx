"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"

const TABS = [
  { key: "all", label: "All", countKey: null },
  { key: "pending", label: "Pending", countKey: "pending" as const },
  { key: "approved", label: "Approved", countKey: "approved" as const },
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
}

export function FacultyAppointmentTabs({ counts }: Props) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get("tab") || "all"

  return (
    <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.key
        const count = tab.countKey ? counts[tab.countKey] : null
        const href = tab.key === "all" ? "/faculty" : `/faculty?tab=${tab.key}`

        return (
          <Link
            key={tab.key}
            href={href}
            className={`
              px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
              ${isActive
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }
            `}
          >
            {tab.label}
            {count !== null && (
              <span
                className={`
                  ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}
                `}
              >
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
