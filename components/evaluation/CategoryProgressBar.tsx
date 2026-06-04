"use client"

interface CategoryProgressBarProps {
  categoryName: string
  answered: number
  total: number
}

export function CategoryProgressBar({ categoryName, answered, total }: CategoryProgressBarProps) {
  const pct = total > 0 ? Math.round((answered / total) * 100) : 0

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-secondary min-w-32">{categoryName}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-tertiary min-w-10 text-right">
        {answered}/{total}
      </span>
    </div>
  )
}
