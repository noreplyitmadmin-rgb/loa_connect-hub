"use client"

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

type DayStatus = "available" | "partially" | "not-available" | "blocked"

interface AvailabilityCalendarProps {
  currentYear: number
  currentMonth: number
  selectedDay: number | null
  now: Date
  userRole: string
  onDayClick: (day: number) => void
  onPrevMonth: () => void
  onNextMonth: () => void
  getDayStatus: (year: number, month: number, day: number) => DayStatus
  showLegend?: boolean
}

export default function AvailabilityCalendar({
  currentYear,
  currentMonth,
  selectedDay,
  now,
  userRole,
  onDayClick,
  onPrevMonth,
  onNextMonth,
  getDayStatus,
  showLegend = false,
}: AvailabilityCalendarProps) {
  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDayOffset = getFirstDayOfMonth(currentYear, currentMonth)

  const calendarCells: (number | null)[] = []
  for (let i = 0; i < firstDayOffset; i++) calendarCells.push(null)
  for (let d = 1; d <= daysInMonth; d++) calendarCells.push(d)

  return (
    <div className="space-y-3">
      {showLegend && userRole === "STUDENT" && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold">
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" /> Available
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" /> Partial
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" /> Unavail.
          </span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-base font-bold text-slate-800">
          {MONTH_NAMES[currentMonth]} {currentYear}
        </h4>
        <button
          onClick={onNextMonth}
          className="p-3 sm:p-2 rounded-lg hover:bg-slate-100 text-slate-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="card overflow-hidden bg-white">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {DAY_NAMES.map((d) => (
            <div
              key={d}
              className="px-1 sm:px-2 py-2 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {calendarCells.map((day, idx) => {
            if (day === null) return <div key={`empty-${idx}`} className="p-2" />

            const dayStatus = getDayStatus(currentYear, currentMonth, day)
            const isToday =
              day === now.getDate() &&
              currentMonth === now.getMonth() &&
              currentYear === now.getFullYear()
            const isSelected = selectedDay === day
            const isPast =
              currentYear < now.getFullYear() ||
              (currentYear === now.getFullYear() && currentMonth < now.getMonth()) ||
              (currentYear === now.getFullYear() && currentMonth === now.getMonth() && day < now.getDate())

            const dotColor =
              dayStatus === "available"
                ? "bg-emerald-500"
                : dayStatus === "partially"
                  ? "bg-blue-400"
                  : dayStatus === "not-available"
                    ? "bg-red-400"
                    : "bg-slate-400"

            return (
              <button
                key={day}
                onClick={() => { if (!isPast) onDayClick(day) }}
                disabled={isPast}
                className={`p-1 sm:p-2 min-h-[40px] sm:min-h-[56px] border border-slate-50 relative transition-colors flex flex-col items-center justify-start
                  ${isSelected ? "bg-gold-50 border-gold-200 z-10" : ""}
                  ${!isPast ? "hover:bg-gold-50/50 cursor-pointer" : ""}
                  ${isPast ? "opacity-40" : ""}`}
              >
                <span
                  className={`text-xs font-semibold ${
                    isToday
                      ? "bg-gold-600 text-white w-6 h-6 rounded-full flex items-center justify-center"
                      : "text-slate-700"
                  }`}
                >
                  {day}
                </span>
                {!isPast && userRole === "STUDENT" && (
                  <span className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
