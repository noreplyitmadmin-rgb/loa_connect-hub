"use client"

import { useMemo } from "react"

function timeToMinutes(h: number, m: number): number {
  return h * 60 + m
}

function fmtDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

interface TimeRange {
  start: string
  end: string
}

interface SlotSuggestionsProps {
  freeRanges: TimeRange[]
  selectedDay: number
  currentYear: number
  currentMonth: number
  now: Date
  selectedSlots: { date: string; start: string; end: string }[]
  showAllBlocks: boolean
  onToggleShowAll: () => void
  onSlotClick: (slot: TimeRange) => void
}

export default function SlotSuggestions({
  freeRanges,
  selectedDay,
  currentYear,
  currentMonth,
  now,
  selectedSlots,
  showAllBlocks,
  onToggleShowAll,
  onSlotClick,
}: SlotSuggestionsProps) {
  const suggestions = useMemo(() => {
    const isToday =
      selectedDay === now.getDate() &&
      currentMonth === now.getMonth() &&
      currentYear === now.getFullYear()
    const currentMinutes = now.getHours() * 60 + now.getMinutes()

    return freeRanges.flatMap((range) => {
      const result: TimeRange[] = []
      const startH = parseInt(range.start.split(":")[0])
      const endH = parseInt(range.end.split(":")[0])
      for (let h = startH; h < endH; h++) {
        if (isToday && timeToMinutes(h, 0) < currentMinutes) continue
        result.push({
          start: `${String(h).padStart(2, "0")}:00`,
          end: `${String(h + 1).padStart(2, "0")}:00`,
        })
      }
      return result
    })
  }, [freeRanges, selectedDay, currentYear, currentMonth, now])

  const currentDateStr = useMemo(
    () => fmtDate(currentYear, currentMonth, selectedDay),
    [currentYear, currentMonth, selectedDay]
  )

  const filteredSuggestions = useMemo(() => {
    const addedSlotsForDate = selectedSlots.filter((s) => s.date === currentDateStr)
    return suggestions.filter(
      (s) => !addedSlotsForDate.some((a) => a.start < s.end && s.start < a.end)
    )
  }, [suggestions, selectedSlots, currentDateStr])

  const displayed = showAllBlocks ? filteredSuggestions : filteredSuggestions.slice(0, 5)

  if (freeRanges.length === 0) return null

  return (
    <div>
      <p className="text-xs font-semibold text-slate-600 mb-2">
        Suggested — click to use, then edit the time:
      </p>
      <div className="grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {displayed.map((slot, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSlotClick(slot)}
            className="card p-3 bg-white border border-slate-200 hover:border-slate-300 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {slot.start} – {slot.end}
            </div>
          </button>
        ))}
      </div>
      {filteredSuggestions.length > 5 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="mt-2 text-xs font-semibold text-gold-600 hover:text-gold-700"
        >
          {showAllBlocks
            ? "Show less"
            : `Show more (${filteredSuggestions.length - 5} more)`}
        </button>
      )}
    </div>
  )
}
