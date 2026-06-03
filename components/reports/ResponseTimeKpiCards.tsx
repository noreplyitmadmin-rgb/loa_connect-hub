"use client"

import type { ResponseTimeStats } from "@/lib/types"

function formatHours(hours: number): string {
  if (hours < 1) {
    const mins = Math.round(hours * 60)
    return `${mins}m`
  }
  if (hours < 24) {
    return `${Math.round(hours * 10) / 10}h`
  }
  const days = Math.round((hours / 24) * 10) / 10
  return `${days}d`
}

interface ResponseTimeKpiCardsProps {
  stats: ResponseTimeStats
}

const icons = {
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  chart: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  bolt: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  exclamation: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
}

export function ResponseTimeKpiCards({ stats }: ResponseTimeKpiCardsProps) {
  const cards = [
    {
      label: "Average Response Time",
      value: formatHours(stats.averageHours),
      detail: `${stats.averageHours.toFixed(1)} hours`,
      color: "text-blue-700",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconPath: icons.clock,
      iconColor: "text-blue-600",
    },
    {
      label: "Median Response Time",
      value: formatHours(stats.medianHours),
      detail: `${stats.medianHours.toFixed(1)} hours`,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconPath: icons.chart,
      iconColor: "text-emerald-600",
    },
    {
      label: "Fastest Response",
      value: formatHours(stats.fastestHours),
      detail: `${stats.fastestHours.toFixed(1)} hours`,
      color: "text-green-700",
      bg: "bg-green-50",
      iconBg: "bg-green-100",
      iconPath: icons.bolt,
      iconColor: "text-green-600",
    },
    {
      label: "Slowest Response",
      value: formatHours(stats.slowestHours),
      detail: `${stats.slowestHours.toFixed(1)} hours`,
      color: "text-red-700",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      iconPath: icons.exclamation,
      iconColor: "text-red-600",
    },
    {
      label: "Total Responded",
      value: String(stats.totalResponded),
      detail: "appointments",
      color: "text-slate-900",
      bg: "bg-slate-50",
      iconBg: "bg-slate-100",
      iconPath: icons.check,
      iconColor: "text-slate-600",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl border border-slate-200/70 ${card.bg} p-4 shadow-sm transition-all duration-200 hover:shadow-md`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center shrink-0`}>
              <svg className={`w-5 h-5 ${card.iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d={card.iconPath} />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-slate-500 truncate">{card.label}</p>
              <p className={`text-xl font-bold ${card.color} font-mono mt-0.5`}>{card.value}</p>
              <p className="text-[10px] text-slate-400 font-mono">{card.detail}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
