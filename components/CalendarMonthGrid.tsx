"use client"

import { useState, useMemo } from "react"
import type { CalendarEvent } from "./CalendarView"

interface CalendarMonthGridProps {
  events: CalendarEvent[]
  onDaySelect?: (date: string) => void
  selectedDate?: string | null
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

export function CalendarMonthGrid({ events, onDaySelect, selectedDate }: CalendarMonthGridProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  const eventDates = useMemo(() => {
    const set = new Set<string>()
    for (const e of events) {
      if (e.date) set.add(e.date)
    }
    return set
  }, [events])

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear((y) => y - 1)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear((y) => y + 1)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const fmtDate = (year: number, month: number, day: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`

  return (
    <div className="card bg-white overflow-hidden">
      {/* Month header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
        <button
          onClick={prevMonth}
          className="p-3 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-bold text-slate-800">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h3>
        <button
          onClick={nextMonth}
          className="p-3 sm:p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-slate-100">
        {DAY_NAMES.map((name) => (
          <div
            key={name}
            className="px-2 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-400"
          >
            {name}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {calendarCells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="p-2" />
          }

          const dateStr = fmtDate(currentYear, currentMonth, day)
          const isToday = dateStr === todayStr
          const hasEvents = eventDates.has(dateStr)
          const isSelected = dateStr === selectedDate
          const isPast = dateStr < todayStr

          return (
            <button
              key={dateStr}
              onClick={() => onDaySelect?.(dateStr)}
              className={`
                relative p-1 sm:p-2 min-h-[40px] sm:min-h-[56px] flex flex-col items-center justify-start gap-0.5
                transition-colors border border-transparent
                ${isPast ? "opacity-40 cursor-default" : "hover:bg-slate-50 cursor-pointer"}
                ${isSelected ? "bg-gold-50 border-gold-200 rounded-lg" : ""}
              `}
            >
              <span
                className={`text-xs font-semibold tabular-nums leading-none ${
                  isToday
                    ? "bg-gold-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                    : "text-slate-700"
                }`}
              >
                {day}
              </span>
              {hasEvents && <span className="w-1.5 h-1.5 rounded-full bg-gold-500 mt-0.5 shrink-0" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
