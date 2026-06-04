"use client"

interface SentimentBadgeProps {
  label: string | null
  score?: number | null
}

const STYLES: Record<string, { bg: string; text: string }> = {
  positive: { bg: "bg-emerald-50", text: "text-emerald-700" },
  negative: { bg: "bg-rose-50", text: "text-rose-700" },
  neutral: { bg: "bg-slate-50", text: "text-slate-600" },
}

export function SentimentBadge({ label, score }: SentimentBadgeProps) {
  if (!label) return null

  const style = STYLES[label] || STYLES.neutral
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
      <span className="capitalize">{label}</span>
      {score !== null && score !== undefined && (
        <span>({(score * 100).toFixed(0)}%)</span>
      )}
    </span>
  )
}
