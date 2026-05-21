const statusStyles: Record<string, { bg: string; text: string; dot: string; border: string }> = {
  PENDING: { 
    bg: "bg-amber-50/60", 
    text: "text-amber-800", 
    dot: "bg-amber-500", 
    border: "border-amber-200/60" 
  },
  APPROVED: { 
    bg: "bg-emerald-50/60", 
    text: "text-emerald-800", 
    dot: "bg-emerald-500", 
    border: "border-emerald-200/60" 
  },
  REJECTED: { 
    bg: "bg-rose-50/60", 
    text: "text-rose-800", 
    dot: "bg-rose-500", 
    border: "border-rose-200/60" 
  },
  COMPLETED: { 
    bg: "bg-indigo-50/60", 
    text: "text-indigo-800", 
    dot: "bg-indigo-500", 
    border: "border-indigo-200/60" 
  },
  CANCELLED: { 
    bg: "bg-slate-50/60", 
    text: "text-slate-600", 
    dot: "bg-slate-400", 
    border: "border-slate-200/60" 
  },
}

export function StatusBadge({ status }: { status: string }) {
  const style = statusStyles[status] || {
    bg: "bg-slate-50/60",
    text: "text-slate-700",
    dot: "bg-slate-400",
    border: "border-slate-200/60"
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      <span className="tracking-wider uppercase">{status}</span>
    </span>
  )
}
