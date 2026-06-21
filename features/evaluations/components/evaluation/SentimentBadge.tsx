"use client"

interface SentimentBadgeProps {
  label: string | null
  score?: number | null
}

const DISPLAY_LABELS: Record<string, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Needs Review",
  mixed: "Needs Review",
}

const STYLES: Record<string, { bg: string; text: string }> = {
  positive: { bg: "bg-emerald-50", text: "text-emerald-700" },
  negative: { bg: "bg-rose-50", text: "text-rose-700" },
  neutral: { bg: "bg-amber-50", text: "text-amber-700" },
  mixed: { bg: "bg-amber-50", text: "text-amber-700" },
}

export function SentimentBadge({ label }: SentimentBadgeProps) {
  if (!label) return null

  const key = label.toLowerCase()
  const style = STYLES[key] || STYLES.neutral
  const display = DISPLAY_LABELS[key] || label
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${style.bg} ${style.text}`}>
      {display}
    </span>
  )
}
