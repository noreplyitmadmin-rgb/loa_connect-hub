"use client"

interface RatingScaleProps {
  value: number | null
  onChange: (value: number) => void
  disabled?: boolean
}

const LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
}

export function RatingScale({ value, onChange, disabled }: RatingScaleProps) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`w-10 h-10 rounded-full text-sm font-semibold transition-colors
            ${value === n
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-white border border-slate-200 text-secondary hover:border-blue-300"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
          `}
          title={LABELS[n]}
        >
          {n}
        </button>
      ))}
    </div>
  )
}
