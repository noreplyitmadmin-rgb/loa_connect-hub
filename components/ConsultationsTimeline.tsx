"use client"

import { useState, useMemo } from "react"
import { CalendarView } from "./CalendarView"
import { CalendarMonthGrid } from "./CalendarMonthGrid"
import type { CalendarEvent } from "./CalendarView"

interface Props {
  events: CalendarEvent[]
  variant?: "consultations" | "meetings"
}

const RANGES = [
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "all", label: "All" },
] as const

type Range = (typeof RANGES)[number]["key"]
type ViewMode = "timeline" | "calendar"

export function ConsultationsTimeline({ events, variant = "consultations" }: Props) {
  const [range, setRange] = useState<Range>("month")
  const [view, setView] = useState<ViewMode>("timeline")
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (range === "all") return events

    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    const endDate = new Date(today)
    endDate.setDate(endDate.getDate() + (range === "week" ? 7 : 30))
    const endStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`

    return events.filter(
      (e) => e.date >= todayStr && e.date <= endStr
    )
  }, [range, events])

  const dayEvents = useMemo(
    () => filtered.filter((e) => e.date === selectedDate),
    [filtered, selectedDate]
  )

  const toggleClass = (isActive: boolean) =>
    `px-3 sm:px-3 py-2 sm:py-1.5 text-xs font-semibold rounded-md transition-colors ${
      isActive
        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
        : "text-slate-500 hover:text-slate-700"
    }`

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-2">
        <h2 className="text-base sm:text-lg font-bold text-slate-900">{variant === "meetings" ? "Upcoming Meetings" : "Upcoming Consultations"}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
            <button
              onClick={() => setView("timeline")}
              className={toggleClass(view === "timeline")}
            >
              Timeline
            </button>
            <button
              onClick={() => setView("calendar")}
              className={toggleClass(view === "calendar")}
            >
              Calendar
            </button>
          </div>
          {/* Range filter — only show in timeline view */}
          {view === "timeline" && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg p-0.5">
              {RANGES.map((r) => (
                <button
                  key={r.key}
                  onClick={() => setRange(r.key)}
                  className={toggleClass(range === r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {view === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CalendarMonthGrid
              events={filtered}
              onDaySelect={(date) =>
                setSelectedDate((prev) => (prev === date ? null : date))
              }
              selectedDate={selectedDate}
            />
          </div>
          <div>
            {selectedDate ? (
              <CalendarView
                events={dayEvents}
                emptyMessage={variant === "meetings" ? "No meetings on this day" : "No consultations on this day"}
                emptySubtext=""
              />
            ) : (
              <div className="card p-8 text-center bg-white h-full flex flex-col items-center justify-center">
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center mb-3 text-slate-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-600">Select a day</p>
                <p className="text-xs text-slate-400 mt-1">Click a date on the calendar to see your consultations.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <CalendarView
          events={filtered}
          emptyMessage={
            variant === "meetings"
              ? (range === "week" ? "No meetings scheduled this week" :
                 range === "month" ? "No meetings scheduled this month" :
                 "No scheduled meetings yet")
              : (range === "week" ? "No consultations scheduled this week" :
                 range === "month" ? "No consultations scheduled this month" :
                 "No scheduled consultations yet")
          }
          emptySubtext={variant === "meetings" ? "Create a meeting above to populate your calendar timeline." : "Book a consultation slot above to populate your calendar timeline."}
        />
      )}
    </div>
  )
}
