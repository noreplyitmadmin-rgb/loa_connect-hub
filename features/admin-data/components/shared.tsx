"use client"

export function SegmentedControl<T extends string>({ options, selected, onSelect }: { options: { key: T; label: string }[]; selected: T; onSelect: (key: T) => void }) {
  return (
    <div className="flex gap-1 p-1 bg-surface-tertiary rounded-xl overflow-x-auto scrollbar-hide">
      {options.map((opt) => (
        <button
          key={opt.key}
          onClick={() => onSelect(opt.key)}
          className={`shrink-0 text-xs sm:text-sm font-semibold px-4 py-2 rounded-lg whitespace-nowrap transition-all duration-200 ${
            selected === opt.key
              ? "bg-surface text-amber-600 shadow-ios-sm"
              : "text-tertiary hover:text-secondary"
          } ios-tab-item`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function SearchInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full text-xs px-3 py-2 rounded-lg border border-default bg-surface-hover focus:border-gold-500 outline-none transition-colors"
    />
  )
}
