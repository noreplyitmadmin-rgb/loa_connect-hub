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
      icon: "📊",
    },
    {
      label: "Completed",
      value: completed,
      color: "text-emerald-700",
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-100",
      icon: "✅",
    },
    {
      label: "Pending",
      value: pending,
      color: "text-amber-700",
      bg: "bg-amber-50",
      iconBg: "bg-amber-100",
      icon: "⏳",
    },
    {
      label: "Approved",
      value: approved,
      color: "text-blue-700",
      bg: "bg-blue-50",
      iconBg: "bg-blue-100",
      icon: "👍",
    },
    {
      label: "Rejected",
      value: rejected,
      color: "text-red-700",
      bg: "bg-red-50",
      iconBg: "bg-red-100",
      icon: "❌",
    },
    {
      label: "Cancelled",
      value: cancelled,
      color: "text-slate-600",
      bg: "bg-slate-50",
      iconBg: "bg-slate-100",
      icon: "↩️",
    },
    {
      label: "Completion Rate",
      value: `${completionRate}%`,
      color: completionRate >= 80 ? "text-emerald-700" : completionRate >= 50 ? "text-amber-700" : "text-red-700",
      bg: completionRate >= 80 ? "bg-emerald-50" : completionRate >= 50 ? "bg-amber-50" : "bg-red-50",
      iconBg: completionRate >= 80 ? "bg-emerald-100" : completionRate >= 50 ? "bg-amber-100" : "bg-red-100",
      icon: "🎯",
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
            <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center text-lg shrink-0`}>
              {card.icon}
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
