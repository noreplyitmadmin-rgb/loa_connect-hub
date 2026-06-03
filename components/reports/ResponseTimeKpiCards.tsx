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

export function ResponseTimeKpiCards({ stats }: ResponseTimeKpiCardsProps) {
  const cards = [
    {
      label: "Average Response Time",
      value: formatHours(stats.averageHours),
      detail: `${stats.averageHours.toFixed(1)} hours`,
      color: "text-blue-700",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      icon: "📊",
    },
    {
      label: "Median Response Time",
      value: formatHours(stats.medianHours),
      detail: `${stats.medianHours.toFixed(1)} hours`,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      icon: "🎯",
    },
    {
      label: "Fastest Response",
      value: formatHours(stats.fastestHours),
      detail: `${stats.fastestHours.toFixed(1)} hours`,
      color: "text-green-700",
      bg: "bg-green-50",
      iconBg: "bg-green-100",
      icon: "⚡",
    },
    {
      label: "Slowest Response",
      value: formatHours(stats.slowestHours),
      detail: `${stats.slowestHours.toFixed(1)} hours`,
      color: "text-red-700",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      icon: "🐢",
    },
    {
      label: "Total Responded",
      value: String(stats.totalResponded),
      detail: "appointments",
      color: "text-slate-900",
      bg: "bg-slate-50",
      iconBg: "bg-slate-100",
      icon: "✅",
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
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center text-lg shrink-0`}>
              {card.icon}
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
