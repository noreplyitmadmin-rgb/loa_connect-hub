"use client"

interface KpiCardsProps {
  total: number
  completed: number
  pending: number
  approved: number
  rejected: number
  cancelled: number
  completionRate: number
}

const icons = {
  chart: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z",
  check: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  clock: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z",
  shield: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z",
  xmark: "M6 18L18 6M6 6l12 12",
  ban: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
  arrowUp: "M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75",
}

export function KpiCards({
  total,
  completed,
  pending,
  approved,
  rejected,
  cancelled,
  completionRate,
}: KpiCardsProps) {
  const cards = [
    {
      label: "Total Consultations",
      value: total,
      color: "text-slate-900",
      bg: "bg-slate-50",
      iconBg: "bg-slate-100",
      iconPath: icons.chart,
      iconColor: "text-slate-600",
    },
    {
      label: "Completed",
      value: completed,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      iconPath: icons.check,
      iconColor: "text-emerald-600",
    },
    {
      label: "Pending",
      value: pending,
      color: "text-amber-700",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      iconPath: icons.clock,
      iconColor: "text-amber-600",
    },
    {
      label: "Approved",
      value: approved,
      color: "text-blue-700",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      iconPath: icons.shield,
      iconColor: "text-blue-600",
    },
    {
      label: "Rejected",
      value: rejected,
      color: "text-red-700",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      iconPath: icons.xmark,
      iconColor: "text-red-600",
    },
    {
      label: "Cancelled",
      value: cancelled,
      color: "text-slate-600",
      bg: "bg-slate-50",
      iconBg: "bg-slate-100",
      iconPath: icons.ban,
      iconColor: "text-slate-500",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      color: completionRate >= 80 ? "text-emerald-700" : completionRate >= 50 ? "text-amber-700" : "text-red-700",
      bg: completionRate >= 80 ? "bg-emerald-50" : completionRate >= 50 ? "bg-amber-50" : "bg-red-50",
      iconBg: completionRate >= 80 ? "bg-emerald-100" : completionRate >= 50 ? "bg-amber-100" : "bg-red-100",
      iconPath: icons.arrowUp,
      iconColor: completionRate >= 80 ? "text-emerald-600" : completionRate >= 50 ? "text-amber-600" : "text-red-600",
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
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
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
